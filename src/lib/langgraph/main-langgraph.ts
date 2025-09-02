// src/lib/langgraph/main-langgraph.ts
import { StateGraph } from '@langchain/langgraph';
import { clauseIdentification } from './clause-identification-agent';
import { clauseCategorization } from './clause-categorization-agent';

export function buildGraph() {
  const graph = new StateGraph<{
    text: string | null;
    clauses: { clause: string; start?: number; end?: number }[] | null;
    categories: { clause: string; category: string }[] | null;
  }>({
    channels: {
      text: null,
      clauses: null,
      categories: null,
    },
  });

  graph.addNode('identify', async (state) => {
    const clauses = await clauseIdentification(state.text!);
    return { ...state, clauses };
  });

  graph.addNode('categorize', async (state) => {
    const categories = await clauseCategorization(state.clauses || []);
    return { ...state, categories };
  });

  graph.addEdge('identify', 'categorize');
  graph.setEntryPoint('identify');

  return graph.compile();
}
export async function runLangGraph(text: string) {
  const graph = buildGraph();
  return await graph.invoke({ text });
}

