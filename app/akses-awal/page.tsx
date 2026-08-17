import AccessGateForm from "@/components/AccessGateForm";

export default async function InitialAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  return <AccessGateForm returnTo={params.returnTo || "/"} />;
}
