interface DisplayProps {
  data: any;
  loading?: boolean;
}

export default function Display({ data, loading }: DisplayProps) {
  if (loading) {
    return (
      <div className="p-4 border rounded bg-gray-100 text-gray-600">
        Analyzing document...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 border rounded bg-gray-100 text-gray-600">
        No summary generated yet.
      </div>
    );
  }

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h2 className="text-xl font-semibold mb-2">Summary</h2>
      <p className="mb-4">{data.summary || "No summary generated yet."}</p>

      <h3 className="font-semibold">Original Extracted Text</h3>
      <p className="whitespace-pre-wrap text-sm text-gray-700 mb-4">
        {data.original?.text || "Not available"}
      </p>

      <h3 className="font-semibold">Translated Text</h3>
      <p className="whitespace-pre-wrap text-sm text-gray-700">
        {data.translated?.text || "Not available"}
      </p>
    </div>
  );
}
