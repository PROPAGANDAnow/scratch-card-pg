import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";
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
      const proUsers = await prisma.user.findMany({
        where: { is_pro: true },
        select: {
          wallet: true,
          username: true,
          pfp: true,
          fid: true,
          cards_count: true
        },
        skip: offset,
        take: BATCH_SIZE,
        orderBy: { created_at: 'asc' }
      });

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
          try {
            await prisma.card.create({
              data: {
                user_wallet: user.wallet,
                payment_tx: "FREE_CARD_PRO_USER",
                prize_amount: prize,
                prize_asset_contract: prizeAsset,
                numbers_json: numbers as any,
                card_no: (user.cards_count || 0) + 1,
                prize_won: prize > 0,
                shared_to: null as any,
                shared_from: null as any,
              }
            });

            // Update user's cards_count
            await prisma.user.update({
              where: { wallet: user.wallet },
              data: {
                cards_count: { increment: 1 },
                last_active: new Date()
              }
            });

            console.log(`✅ Created free card for pro user: ${user.username || 'Unknown'} (${user.wallet})`);
            totalProcessed++;
          } catch (createError) {
            console.error(`❌ Error creating card for user ${user.wallet}:`, createError);
            totalErrors++;
            continue;
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
      try {
        await prisma.stats.upsert({
          where: { id: 1 },
          update: {
            cards: { increment: totalProcessed },
            updated_at: new Date()
          },
          create: {
            id: 1,
            cards: totalProcessed,
            reveals: 0,
            winnings: 0
          }
        });
        console.log(`📊 Updated app stats: +${totalProcessed} cards`);
      } catch (statsError) {
        console.error('❌ Error updating app stats:', statsError);
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
