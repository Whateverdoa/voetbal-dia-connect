import { ConnectedPortal } from "@/components/ConnectedPortal";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; playerId: string }>;
}) {
  const { slug, playerId } = await params;
  return <ConnectedPortal slug={slug} playerId={playerId} view="player" />;
}
