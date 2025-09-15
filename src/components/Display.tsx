"use client";
import { useEffect, useState } from "react";
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

export default function Display({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <div>Loading...</div>;
  if (!data) return null;

  // Use displayData from enhanced-ui-generator if available
  const displayData = data?.uiStructure?.displayData || {};
  
  // Log the data structure to terminal for debugging
  console.log("Display component received data:", JSON.stringify(data, null, 2));
  
  const summary = displayData?.summary?.summaryText || data?.summary?.summaryText;
  const points = displayData?.summary?.importantPoints || data?.summary?.importantPoints || [];
  const risks = displayData?.summary?.mainRisksRightsConsequences || data?.summary?.mainRisksRightsConsequences;
  const actions = displayData?.summary?.whatYouShouldDoNow || data?.summary?.whatYouShouldDoNow || [];
  const clauses = displayData?.clauses || data?.clauses || [];
  const related = displayData?.relatedInfo || data?.relatedInfo || [];
  const tables = displayData?.tables || data?.tables || [];
  const charts = displayData?.flowCharts || data?.flowCharts || [];
  const images = displayData?.images || data?.images || [];
  const webSearchResults = displayData?.webSearchResults || data?.webSearchResults || [];

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      <SummaryCard summary={summary} />
      <KeyPoints points={points} />
      <RisksCard risks={risks} ignore={data?.summary?.whatHappensIfYouIgnoreThis} />
      <ActionsCard actions={actions} />
      <ClausesCard clauses={clauses} />
      <RelatedInfoGrid items={related} />
      {tables.length > 0 && <TableComponent data={tables} />}
      {charts.length > 0 && <FlowChartComponent data={charts} />}
      {images.length > 0 && <ImagesComponent data={images} />}
      {webSearchResults.length > 0 && <WebSearchResults data={webSearchResults} />}
      <Chatbot context={data} />
    </div>
  );
}
