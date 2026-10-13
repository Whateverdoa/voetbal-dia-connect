import { ConnectedPortal } from "@/components/ConnectedPortal";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ConnectedPortal slug={slug} view="coaching" />;
}
