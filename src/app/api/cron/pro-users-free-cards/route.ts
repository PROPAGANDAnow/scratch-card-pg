import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabaseAdmin";
import { drawPrize } from "~/lib/drawPrize";
import { generateNumbers } from "~/lib/generateNumbers";
import { PRIZE_ASSETS, USDC_ADDRESS } from "~/lib/constants";

const BATCH_SIZE = 50; // Process 50 users at a time to avoid timeouts

export async function GET(request: NextRequest) {
  try {
    // Verify it's from Vercel cron
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (!process.env.CRON_SECRET) {
      console.error('❌ CRON_SECRET environment variable not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    if (authHeader !== expectedAuth) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🎯 Starting pro users free cards cron job...');
    
    let totalProcessed = 0;
    let totalErrors = 0;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      // Fetch batch of pro users
      const { data: proUsers, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('wallet, username, pfp, fid, cards_count')
        .eq('is_pro', true)
        .not('wallet', 'is', null) // Ensure wallet is not null
        .range(offset, offset + BATCH_SIZE - 1)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('❌ Error fetching pro users:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch pro users', details: fetchError.message },
          { status: 500 }
        );
      }

      if (!proUsers || proUsers.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`📦 Processing batch: ${proUsers.length} users (offset: ${offset})`);

      // Process each user in the batch
      for (const user of proUsers) {
        try {
          // Validate user data
          if (!user.wallet || typeof user.wallet !== 'string') {
            console.error(`❌ Invalid wallet for user:`, user);
            totalErrors++;
            continue;
          }

          // Generate a random prize for the free card
          const prize = drawPrize(false); // No friends available for pro users
          const prizeAsset = PRIZE_ASSETS[Math.floor(Math.random() * PRIZE_ASSETS.length)] || USDC_ADDRESS;
          
          // Generate card numbers
          const numbers = generateNumbers({
            prizeAmount: prize,
            prizeAsset,
            decoyAmounts: [0.5, 0.75, 1, 1.5, 2, 5, 10],
            decoyAssets: PRIZE_ASSETS as unknown as string[],
            friends: [], // No friends for pro users
          });

          // Validate generated numbers
          if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
            console.error(`❌ Failed to generate numbers for user ${user.wallet}`);
            totalErrors++;
            continue;
          }

          // Create the free card
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { data: newCard, error: createError } = await supabaseAdmin
            .from('cards')
            .insert({
              user_wallet: user.wallet,
              payment_tx: "FREE_CARD_PRO_USER",
              prize_amount: prize,
              prize_asset_contract: prizeAsset,
              numbers_json: numbers,
              scratched: false,
              claimed: false,
              created_at: new Date().toISOString(),
              card_no: (user.cards_count || 0) + 1,
              shared_to: null,
              shared_from: null,
            })
            .select()
            .single();

          if (createError) {
            console.error(`❌ Error creating card for user ${user.wallet}:`, createError);
            totalErrors++;
            continue;
          }

          // Update user's cards_count
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ 
              cards_count: (user.cards_count || 0) + 1,
              last_active: new Date().toISOString()
            })
            .eq('wallet', user.wallet);

          if (updateError) {
            console.error(`❌ Error updating cards_count for user ${user.wallet}:`, updateError);
            totalErrors++;
            // Don't increment totalProcessed if user update failed
          } else {
            console.log(`✅ Created free card for pro user: ${user.username || 'Unknown'} (${user.wallet})`);
            totalProcessed++;
          }

        } catch (error) {
          console.error(`❌ Unexpected error processing user ${user.wallet || 'unknown'}:`, error);
          totalErrors++;
        }
      }

      // Check if we have more users to process
      hasMore = proUsers.length === BATCH_SIZE;
      offset += BATCH_SIZE;

      // Add a small delay between batches to avoid overwhelming the database
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update app stats - increment cards count (only if we processed any cards)
    if (totalProcessed > 0) {
      const { data: currentStats, error: fetchStatsError } = await supabaseAdmin
        .from('stats')
        .select('cards')
        .eq('id', 1)
        .single();

      if (!fetchStatsError && currentStats) {
        const { error: statsError } = await supabaseAdmin
          .from('stats')
          .update({ 
            cards: (currentStats.cards || 0) + totalProcessed,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);

        if (statsError) {
          console.error('❌ Error updating app stats:', statsError);
        } else {
          console.log(`📊 Updated app stats: +${totalProcessed} cards`);
        }
      } else if (fetchStatsError) {
        console.error('❌ Error fetching current stats:', fetchStatsError);
      }
    }

    const result = {
      success: true,
      message: 'Pro users free cards cron job completed',
      totalProcessed,
      totalErrors,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 Pro users free cards cron job completed:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('💥 Fatal error in pro users free cards cron job:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
