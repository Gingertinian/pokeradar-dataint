import { Explorer } from "@/components/explorer";
import { readNavigation } from "@/lib/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const navigation = readNavigation(params);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());

  return (
    <Explorer
      initialRegionId={navigation.regionId}
      initialSiteId={navigation.siteId}
      initialSelectedId={navigation.selectedId}
      initialMapMode={navigation.mapMode}
      initialScope={navigation.scope}
      initialCamera={navigation.camera}
      initialRound={navigation.round}
      day={day}
    />
  );
}
