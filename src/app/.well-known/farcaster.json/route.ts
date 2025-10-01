function withValidProperties(
  properties: Record<string, undefined | string | string[]>
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([_, value]) =>
      Array.isArray(value) ? value.length > 0 : !!value
    )
  );
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL as string;
  return Response.json({
    accountAssociation: {
      header: process.env.FARCASTER_HEADER,
      payload: process.env.FARCASTER_PAYLOAD,
      signature: process.env.FARCASTER_SIGNATURE,
    },
    frame: withValidProperties({
      version: "1",
      name: "Scratch Off",
      subtitle: "Scratch to win big!",
      description: "Scratch to win big!",
      imageUrl: "https://scratch-card-pg.vercel.app/assets/splash-image.jpg",
      buttonTitle: "Play Now",
      screenshotUrls: [],
      iconUrl: "https://scratch-card-pg.vercel.app/assets/splash-image.jpg",
      splashImageUrl:
        "https://scratch-card-pg.vercel.app/assets/splash-image.jpg",
      splashBackgroundColor: "#FFFFFF",
      homeUrl: URL,
      webhookUrl: `${URL}/api/webhook`,
      primaryCategory: process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY,
      tags: ["games"],
      heroImageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
      tagline: "Scratch to win big!",
      ogTitle: "Scratch Off",
      ogDescription: "Scratch to win big!",
      ogImageUrl: "https://scratch-card-pg.vercel.app/assets/splash-image.jpg",
      // use only while testing
      noindex: false,
    }),
  });
}
