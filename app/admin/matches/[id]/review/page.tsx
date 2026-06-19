import AdminDashboard from "@/components/admin/AdminDashboard";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminMatchReviewPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <AdminDashboard initialSection="pendingImports" focusImportBatchId={id} />
    </main>
  );
}
