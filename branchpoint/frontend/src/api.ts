import axios from 'axios';
import { 
  CreateDecisionRequest, 
  CreateBranchRequest, 
  SimulateRequest, 
  CommitDecisionRequest,
  ResolveDecisionRequest,
  GroupDecisionsRequest,
  Decision,
  Branch,
  DecisionTree
} from './types';

const API_BASE_URL = 'http://localhost:3001/dev';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use((config) => {
  console.log('🚀 API Request:', config.method?.toUpperCase(), config.url, config.data);
  return config;
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url, response.data);
    return response;
  },
  (error) => {
    console.log('❌ API Error:', error.response?.status, error.config?.url, error.message);
    return Promise.reject(error);
  }
);

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add user ID for demo purposes
  const userId = localStorage.getItem('userId');
  if (userId) {
    config.headers['x-user-id'] = userId;
  }
  
  return config;
});

export const apiClient = {
  // Decisions
  createDecision: async (data: CreateDecisionRequest): Promise<{ decisionId: string; createdAt: string }> => {
    const response = await api.post('/decisions', data);
    return response.data;
  },

  listDecisions: async (): Promise<{ decisions: Decision[]; count: number }> => {
    const response = await api.get('/decisions');
    return response.data;
  },

  getDecision: async (decisionId: string): Promise<{ decision: Decision; branches: Branch[] }> => {
    const response = await api.get(`/decisions/${decisionId}`);
    return response.data;
  },

  // Branches
  createBranch: async (decisionId: string, data: CreateBranchRequest): Promise<{ branchId: string; decisionId: string; createdAt: string }> => {
    const response = await api.post(`/decisions/${decisionId}/branches`, data);
    return response.data;
  },

  // Simulation
  simulateBranch: async (data: SimulateRequest, userId?: string): Promise<{ conversationId: string; simulationOutput: any; messages: any[] }> => {
    const response = await api.post('/simulate', data, {
      headers: userId ? { 'x-user-id': userId } : {}
    });
    return response.data;
  },

  // AI Branch Generation
  generateBranches: async (decisionTitle: string, decisionDescription: string): Promise<{ branches: Array<{ branchId: string; name: string; description: string }> }> => {
    const response = await api.post('/generate-branches', {
      decisionTitle,
      decisionDescription
    });
    return response.data;
  },

  // Generate Follow-up Decisions
  generateFollowUpDecisions: async (originalDecision: string, chosenPath: string, simulationResult: any, decisionContext?: string): Promise<{ storyline: string; followUpDecisions: Array<{ name: string; description: string }> }> => {
    const response = await api.post('/generate-followup-decisions', {
      originalDecision,
      chosenPath,
      simulationResult,
      decisionContext
    });
    return response.data;
  },

  // Generate Follow-up Simulation
  generateFollowUpSimulation: async (originalDecision: string, followUpName: string, followUpDescription: string): Promise<{ simulation: any }> => {
    const response = await api.post('/generate-followup-simulation', {
      originalDecision,
      followUpName,
      followUpDescription
    });
    return response.data;
  },

  // Generate Specific Follow-up Decisions
  generateSpecificFollowUpDecisions: async (originalDecision: string, chosenPath: string, broadCategory: string, simulationResult: any): Promise<{ specificDecisions: Array<{ name: string; description: string }> }> => {
    const response = await api.post('/generate-specific-followup-decisions', {
      originalDecision,
      chosenPath,
      broadCategory,
      simulationResult
    });
    return response.data;
  },

  // Generate Path Forward
  generatePathForward: async (originalDecision: string, chosenPath: string, pathDescription: string): Promise<{ pathForward: any }> => {
    const response = await api.post('/generate-path-forward', {
      originalDecision,
      chosenPath,
      pathDescription
    });
    return response.data;
  },

  // Comparison
  generateComparison: async (decisionId: string): Promise<{ comparisonId: string; generatedDiff: any; branches: Branch[] }> => {
    const response = await api.get(`/decisions/${decisionId}/comparison`);
    return response.data;
  },

  // Commit
  commitDecision: async (decisionId: string, data: CommitDecisionRequest): Promise<{ status: string; decisionId: string; finalBranchId: string; preConfidence: number; postConfidence: number; confidenceDelta: number }> => {
    const response = await api.post(`/decisions/${decisionId}/commit`, data);
    return response.data;
  },

  // Resolve Decision
  resolveDecision: async (decisionId: string, data: ResolveDecisionRequest): Promise<{ status: string; decisionId: string; finalBranchId: string; preConfidence: number; postConfidence: number; confidenceDelta: number; subDecision?: any }> => {
    const response = await api.post(`/decisions/${decisionId}/resolve`, data);
    return response.data;
  },

  // Decision Tree
  getDecisionTree: async (): Promise<DecisionTree> => {
    const response = await api.get('/decisions/tree');
    return response.data;
  },

  // Group Decisions
  groupDecisions: async (data: GroupDecisionsRequest): Promise<{ groupId: string; name: string; description: string; decisionIds: string[]; createdAt: string }> => {
    const response = await api.post('/decisions/group', data);
    return response.data;
  },

  // Get Decision Groups
  getDecisionGroups: async (): Promise<{ groups: any[]; count: number }> => {
    const response = await api.get('/decisions/groups');
    return response.data;
  },

  // Generate Clarifying Questions
  generateClarifyingQuestions: async (decisionTitle: string, decisionDescription?: string): Promise<{ questions: string[] }> => {
    const response = await api.post('/generate-clarifying-questions', {
      decisionTitle,
      decisionDescription: decisionDescription || ''
    });
    return response.data;
  },

  // Generate Decision Summary
  generateDecisionSummary: async (decisionTitle: string, originalDescription: string, userResponses: { question: string; answer: string }[]): Promise<{ summary: string; enhancedDescription: string }> => {
    const response = await api.post('/generate-decision-summary', {
      decisionTitle,
      originalDescription,
      userResponses
    });
    return response.data;
  },

  // Check if clarification is needed for realistic simulation
  checkClarificationNeeded: async (decisionTitle: string, decisionDescription: string): Promise<{ needsClarification: boolean; reason?: string }> => {
    const response = await api.post('/check-clarification-needed', {
      decisionTitle,
      decisionDescription
    });
    return response.data;
  },

};

export default apiClient;
