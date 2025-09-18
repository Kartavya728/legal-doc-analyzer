"use client";
import SummaryCard from "./display/SummaryCard";
import KeyPoints from "./display/KeyPoints";
import RisksCard from "./display/RisksCard";
import ActionsCard from "./display/ActionsCard";
import ClausesCard from "./display/ClausesCard";
import RelatedInfoGrid from "./display/RelatedInfoGrid";
import TableComponent from "./display/TableComponent";
import FlowChartComponent from "./display/FlowChartComponent";
import ImagesComponent from "./display/ImagesComponent";
import WebSearchResults from "./display/WebSearchResults";
import Chatbot from "./display/Chatbot";

// Import the new DocumentComparison component
import DocumentComparison from "./display/DocumentComparison";

interface DisplayProps {
    data: any;
    loading: boolean;
    uploadedImageUrl: string | null;
}

export default function Display({ data, loading, uploadedImageUrl }: DisplayProps) {
    if (loading) return <div>Loading...</div>;
    if (!data) return null;

    // Destructure analysisType from the data object to decide which UI to render
    const { analysisType, ...componentData } = data;

    // --- UI Routing Logic ---
    if (analysisType === 'compare') {
        // If it's a comparison, render the DocumentComparison component
        // and pass the rest of the data to it.
        return <DocumentComparison {...componentData} />;
    }

    // --- Default Detailed Analysis UI (Original Logic) ---
    const displayData = componentData?.uiStructure?.displayData || {};
    
    const summary = displayData?.summary?.summaryText || componentData?.summary?.summaryText;
    const points = displayData?.summary?.importantPoints || componentData?.summary?.importantPoints || [];
    const risks = displayData?.summary?.mainRisksRightsConsequences || componentData?.summary?.mainRisksRightsConsequences;
    const actions = displayData?.summary?.whatYouShouldDoNow || componentData?.summary?.whatYouShouldDoNow || [];
    const clauses = displayData?.clauses || componentData?.clauses || [];
    const related = displayData?.relatedInfo || componentData?.relatedInfo || [];
    const tables = displayData?.tables || componentData?.tables || [];
    const charts = displayData?.flowCharts || componentData?.flowCharts || [];
    const images = displayData?.images || componentData?.images || [];
    const webSearchResults = displayData?.webSearchResults || componentData?.webSearchResults || [];

    return (
        <div className="container mx-auto px-6 py-8 space-y-8">
            <SummaryCard summary={summary} />
            <KeyPoints points={points} />
            <RisksCard risks={risks} ignore={componentData?.summary?.whatHappensIfYouIgnoreThis} />
            <ActionsCard actions={actions} />
            <ClausesCard clauses={clauses} />
            <RelatedInfoGrid items={related} />
            {tables.length > 0 && <TableComponent data={tables} />}
            {charts.length > 0 && <FlowChartComponent data={charts} />}
            {images.length > 0 && <ImagesComponent data={images} />}
            {webSearchResults.length > 0 && <WebSearchResults data={webSearchResults} />}
            <Chatbot context={componentData} />
        </div>
    );
}