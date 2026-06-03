const express = require('express');
const cors = require('cors');
const { generatePathForward } = require('./bedrock-dev');
const app = express();
const port = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const decisions = [];
const branches = [];
const conversations = [];
const comparisons = [];
const events = [];
const decisionGroups = [];

// Mock user ID for demo
const getUserId = (req) => {
  return req.headers['x-user-id'] || `user_${Date.now()}`;
};

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'BranchPoint API is running' });
});

// Clear all data (for development)
app.post('/clear-all', (req, res) => {
  decisions.length = 0;
  branches.length = 0;
  conversations.length = 0;
  comparisons.length = 0;
  events.length = 0;
  decisionGroups.length = 0;
  
  console.log('🧹 Cleared all data');
  res.json({ 
    status: 'success', 
    message: 'All data cleared',
    counts: {
      decisions: decisions.length,
      branches: branches.length,
      conversations: conversations.length,
      comparisons: comparisons.length,
      events: events.length,
      decisionGroups: decisionGroups.length
    }
  });
});


// Decisions
app.post('/decisions', (req, res) => {
  const userId = getUserId(req);
  let { title, description, preConfidence } = req.body;
  
  // Remove "life branch" prefix if present
  if (title && title.toLowerCase().startsWith('life branch')) {
    title = title.substring(11).trim(); // Remove "life branch " (11 characters)
  }
  
  console.log('📝 Creating decision:', { title, description, preConfidence, userId });
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const decision = {
    decisionId: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    title,
    description: description || '',
    preConfidence: preConfidence || 3,
    state: 'DRAFT',
    createdAt: new Date().toISOString(),
  };

  decisions.push(decision);
  console.log('✅ Decision created:', decision.decisionId);
  console.log('📊 Total decisions:', decisions.length);
  
  res.status(201).json({
    decisionId: decision.decisionId,
    createdAt: decision.createdAt,
  });
});

app.get('/decisions', (req, res) => {
  const userId = getUserId(req);
  const userDecisions = decisions.filter(d => d.userId === userId);
  userDecisions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json({
    decisions: userDecisions,
    count: userDecisions.length,
  });
});

app.get('/decisions/:id', (req, res) => {
  const userId = getUserId(req);
  const decision = decisions.find(d => d.decisionId === req.params.id && d.userId === userId);
  
  if (!decision) {
    return res.status(404).json({ error: 'Decision not found' });
  }

  const decisionBranches = branches.filter(b => b.decisionId === req.params.id);
  const branchesWithConversations = decisionBranches.map(branch => ({
    ...branch,
    conversations: conversations.filter(c => c.branchId === branch.branchId),
  }));

  res.json({
    decision,
    branches: branchesWithConversations,
  });
});

// Branches
app.post('/decisions/:id/branches', (req, res) => {
  const userId = getUserId(req);
  const decisionId = req.params.id;
  
  console.log('🔍 Looking for decision:', decisionId);
  console.log('🔍 Available decisions:', decisions.map(d => d.decisionId));
  console.log('🔍 User ID:', userId);
  
  const decision = decisions.find(d => d.decisionId === decisionId && d.userId === userId);
  
  if (!decision) {
    console.log('❌ Decision not found for ID:', decisionId);
    return res.status(404).json({ error: 'Decision not found' });
  }

  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Branch name is required' });
  }

  const branch = {
    branchId: `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    decisionId: req.params.id,
    name,
    description: description || '',
    createdAt: new Date().toISOString(),
  };

  branches.push(branch);
  res.status(201).json({
    branchId: branch.branchId,
    decisionId: branch.decisionId,
    createdAt: branch.createdAt,
  });
});

// Simulation
app.post('/simulate', async (req, res) => {
  const { branchId, personaStyle = 'analytical' } = req.body;
  
  if (!branchId) {
    return res.status(400).json({ error: 'Branch ID is required' });
  }

  const branch = branches.find(b => b.branchId === branchId);
  if (!branch) {
    return res.status(404).json({ error: 'Branch not found' });
  }

  const decision = decisions.find(d => d.decisionId === branch.decisionId);
  if (!decision) {
    return res.status(404).json({ error: 'Decision not found' });
  }

  try {
    console.log('🤖 Using Claude AI to generate simulation for:', {
      decisionTitle: decision.title,
      branchName: branch.name,
      branchDescription: branch.description,
      personaStyle,
      decisionContext: decision.description ? 'Enhanced description available' : 'No enhanced description'
    });

    // Use real Bedrock function for simulation
    const { generateSimulation } = require('./bedrock-js');
    const simulationResult = await generateSimulation(
      decision.title,
      branch.name,
      branch.description,
      personaStyle,
      decision.description // Pass the decision's description as context (which may be enhanced)
    );
    
    console.log('✅ Generated simulation:', simulationResult);

    const simulationOutput = {
      questions: simulationResult.questions,
      optimisticScenario: simulationResult.optimistic_scenario,
      challengingScenario: simulationResult.challenging_scenario,
      summary: simulationResult.summary,
      personaStyle: personaStyle,
      confidenceDeltaRecommendation: simulationResult.confidence_delta_recommendation
    };

    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const conversation = {
      conversationId,
      branchId,
      messages: [
        {
          messageId: `msg_${Date.now()}_1`,
          sender: 'future-you',
          text: `I'm Future-You, one year from now. I chose the "${branch.name}" path for "${decision.title}". Let me share what I learned...`,
          createdAt: now,
        },
        {
          messageId: `msg_${Date.now()}_2`,
          sender: 'future-you',
          text: `Here are some questions that would have helped me make this choice: ${simulationOutput.questions.join(', ')}`,
          createdAt: now,
        },
        {
          messageId: `msg_${Date.now()}_3`,
          sender: 'future-you',
          text: `Optimistic scenario: ${simulationOutput.optimisticScenario}`,
          createdAt: now,
        },
        {
          messageId: `msg_${Date.now()}_4`,
          sender: 'future-you',
          text: `Challenging scenario: ${simulationOutput.challengingScenario}`,
          createdAt: now,
        },
        {
          messageId: `msg_${Date.now()}_5`,
          sender: 'future-you',
          text: `Summary: ${simulationOutput.summary}`,
          createdAt: now,
        },
      ],
      simulationOutput,
      createdAt: now,
      updatedAt: now,
    };

    conversations.push(conversation);

    // Update branch with simulation timestamp
    const branchIndex = branches.findIndex(b => b.branchId === branchId);
    if (branchIndex !== -1) {
      branches[branchIndex].lastSimulatedAt = now;
    }

    res.json({
      conversationId,
      simulationOutput,
      messages: conversation.messages,
    });
  } catch (error) {
    console.error('❌ Error generating simulation:', error);
    res.status(500).json({ error: 'Failed to generate simulation' });
  }
});

// Generate Branches using Claude AI
app.post('/generate-branches', async (req, res) => {
  const { decisionTitle, decisionDescription } = req.body;
  
  if (!decisionTitle) {
    return res.status(400).json({ error: 'Decision title is required' });
  }

  try {
    console.log('🤖 Using Claude AI to generate branches for:', { decisionTitle, decisionDescription });
    
    // Import the AI function
    const { generateBranchesAI } = require('./generate-branches-ai');
    
    // Call AI to generate contextual branches
    const aiResponse = await generateBranchesAI(decisionTitle, decisionDescription);
    
    // Add branch IDs and timestamps
    const branches = aiResponse.branches.map((branch, index) => ({
      branchId: `ai-${Date.now()}-${index}`,
      name: branch.name,
      description: branch.description
    }));
    
    console.log('✅ Claude generated branches:', branches);
    res.json({ branches });
    
  } catch (error) {
    console.error('❌ Error generating AI branches:', error);
    
    // Fallback to simple hardcoded logic if AI fails
    console.log('🔄 Falling back to hardcoded logic');
    const question = decisionTitle.toLowerCase();
    const desc = decisionDescription?.toLowerCase() || '';
    
    let branches = [];
    
    if (question.includes('job') && (question.includes('amazon') || question.includes('microsoft') || question.includes('apple'))) {
      const companies = [];
      const combinedText = `${question} ${desc}`;
      if (combinedText.includes('amazon')) companies.push('Amazon');
      if (combinedText.includes('microsoft')) companies.push('Microsoft');
      if (combinedText.includes('apple')) companies.push('Apple');
      
      const company1 = companies[0] || 'Company A';
      const company2 = companies[1] || 'Company B';
      
      branches = [
        {
          branchId: `fallback-${company1.toLowerCase()}-${Date.now()}`,
          name: `Accept ${company1} Offer`,
          description: `Choose the ${company1} position and move forward with their offer.`
        },
        {
          branchId: `fallback-${company2.toLowerCase()}-${Date.now()}`,
          name: `Accept ${company2} Offer`,
          description: `Choose the ${company2} position and move forward with their offer.`
        }
      ];
    } else {
      branches = [
        {
          branchId: `fallback-yes-${Date.now()}`,
          name: 'Yes - Take Action',
          description: 'Move forward with this decision and embrace the opportunities it brings'
        },
        {
          branchId: `fallback-no-${Date.now()}`,
          name: 'No - Wait or Decline',
          description: 'Hold off on this decision and explore alternative options'
        }
      ];
    }
    
    res.json({ branches });
  }
});

// Generate Follow-up Decisions
app.post('/generate-followup-decisions', async (req, res) => {
  const { originalDecision, chosenPath, simulationResult, decisionContext } = req.body;
  
  if (!originalDecision || !chosenPath) {
    return res.status(400).json({ error: 'Original decision and chosen path are required' });
  }

  try {
    console.log('🤖 Using Claude AI to generate follow-up decisions for:', {
      originalDecision,
      chosenPath,
      simulationResult,
      decisionContext: decisionContext ? 'Enhanced context available' : 'No enhanced context'
    });

    // Use real Bedrock function
    const { generateFollowUpDecisions } = require('./bedrock-js');
    const result = await generateFollowUpDecisions(originalDecision, chosenPath, simulationResult, decisionContext);
    
    console.log('✅ Generated follow-up decisions:', result);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error generating follow-up decisions:', error);
    res.status(500).json({ error: 'Failed to generate follow-up decisions' });
  }
});

// Comparison
app.get('/decisions/:id/comparison', (req, res) => {
  const userId = getUserId(req);
  const decision = decisions.find(d => d.decisionId === req.params.id && d.userId === userId);
  
  if (!decision) {
    return res.status(404).json({ error: 'Decision not found' });
  }

  const decisionBranches = branches.filter(b => b.decisionId === req.params.id);
  const simulatedBranches = decisionBranches.filter(b => b.lastSimulatedAt);

  if (simulatedBranches.length < 2) {
    return res.status(400).json({ error: 'At least 2 branches must be simulated before comparison' });
  }

  // Mock comparison response
  const comparisonResult = {
    tradeoffs: [
      `${simulatedBranches[0].name} offers more structure and predictability, while ${simulatedBranches[1].name} provides flexibility and spontaneity`,
      `Time investment: ${simulatedBranches[0].name} requires more upfront planning, ${simulatedBranches[1].name} allows for more organic growth`,
      `Risk tolerance: ${simulatedBranches[0].name} is lower risk with steady progress, ${simulatedBranches[1].name} has higher potential but more uncertainty`
    ],
    mergeConflicts: [
      `Conflicting time commitments between ${simulatedBranches[0].name} and ${simulatedBranches[1].name}`,
      `Different approaches to decision-making that may create internal tension`,
      `Resource allocation conflicts - both paths require significant investment`
    ],
    recommendedMerge: `Based on the analysis, I recommend a hybrid approach that combines the structured planning from ${simulatedBranches[0].name} with the flexibility of ${simulatedBranches[1].name}. Start with a clear framework but remain open to opportunities that align with your core values.`,
    confidenceImpact: `This decision will likely increase your confidence by 0.6 points on average. The structured analysis and future-self perspective provide clarity that reduces decision anxiety and increases conviction in your chosen path.`
  };

  const comparisonId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const comparison = {
    comparisonId,
    decisionId: req.params.id,
    branchesCompared: simulatedBranches.slice(0, 2).map(b => b.branchId),
    generatedDiff: comparisonResult,
    createdAt: new Date().toISOString(),
  };

  comparisons.push(comparison);

  res.json({
    comparisonId,
    generatedDiff: comparisonResult,
    branches: simulatedBranches.slice(0, 2),
  });
});

// Commit
app.post('/decisions/:id/commit', (req, res) => {
  const userId = getUserId(req);
  const decision = decisions.find(d => d.decisionId === req.params.id && d.userId === userId);
  
  if (!decision) {
    return res.status(404).json({ error: 'Decision not found' });
  }

  const { finalBranchId, postConfidence } = req.body;
  
  if (!finalBranchId) {
    return res.status(400).json({ error: 'Final branch ID is required' });
  }

  if (!postConfidence || postConfidence < 1 || postConfidence > 5) {
    return res.status(400).json({ error: 'Post-confidence must be between 1 and 5' });
  }

  const finalBranch = branches.find(b => b.branchId === finalBranchId);
  if (!finalBranch || finalBranch.decisionId !== req.params.id) {
    return res.status(404).json({ error: 'Final branch not found or does not belong to this decision' });
  }

  // Update decision to COMMITTED state
  const decisionIndex = decisions.findIndex(d => d.decisionId === req.params.id);
  if (decisionIndex !== -1) {
    decisions[decisionIndex].state = 'COMMITTED';
    decisions[decisionIndex].postConfidence = postConfidence;
    decisions[decisionIndex].updatedAt = new Date().toISOString();
  }

  // Log commit event
  const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const commitEvent = {
    eventId,
    userId,
    type: 'METRIC',
    payload: {
      event: 'commit',
      decisionId: req.params.id,
      finalBranchId,
      preConfidence: decision.preConfidence,
      postConfidence,
      confidenceDelta: postConfidence - decision.preConfidence,
      decisionTitle: decision.title,
      finalBranchName: finalBranch.name,
    },
    createdAt: new Date().toISOString(),
  };

  events.push(commitEvent);

  res.json({
    status: 'committed',
    decisionId: req.params.id,
    finalBranchId,
    preConfidence: decision.preConfidence,
    postConfidence,
    confidenceDelta: postConfidence - decision.preConfidence,
  });
});

// Resolve Decision (with optional sub-decision creation)
app.post('/decisions/:id/resolve', (req, res) => {
  const userId = getUserId(req);
  const decision = decisions.find(d => d.decisionId === req.params.id && d.userId === userId);
  
  if (!decision) {
    return res.status(404).json({ error: 'Decision not found' });
  }

  const { finalBranchId, postConfidence, createSubDecision, subDecisionTitle, subDecisionDescription } = req.body;
  
  if (!finalBranchId) {
    return res.status(400).json({ error: 'Final branch ID is required' });
  }

  if (!postConfidence || postConfidence < 1 || postConfidence > 5) {
    return res.status(400).json({ error: 'Post-confidence must be between 1 and 5' });
  }

  const finalBranch = branches.find(b => b.branchId === finalBranchId);
  if (!finalBranch || finalBranch.decisionId !== req.params.id) {
    return res.status(404).json({ error: 'Final branch not found or does not belong to this decision' });
  }

  // Update decision to RESOLVED state
  const decisionIndex = decisions.findIndex(d => d.decisionId === req.params.id);
  if (decisionIndex !== -1) {
    decisions[decisionIndex].state = 'RESOLVED';
    decisions[decisionIndex].postConfidence = postConfidence;
    decisions[decisionIndex].resolvedAt = new Date().toISOString();
    decisions[decisionIndex].updatedAt = new Date().toISOString();
  }

  let subDecision = null;
  
  // Create sub-decision if requested
  if (createSubDecision && subDecisionTitle) {
    subDecision = {
      decisionId: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title: subDecisionTitle,
      description: subDecisionDescription || '',
      preConfidence: 3,
      state: 'DRAFT',
      parentDecisionId: req.params.id,
      parentBranchId: finalBranchId,
      isRootDecision: false,
      createdAt: new Date().toISOString(),
    };
    
    decisions.push(subDecision);
  }

  // Log resolve event
  const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const resolveEvent = {
    eventId,
    userId,
    type: 'METRIC',
    payload: {
      event: 'resolve',
      decisionId: req.params.id,
      finalBranchId,
      preConfidence: decision.preConfidence,
      postConfidence,
      confidenceDelta: postConfidence - decision.preConfidence,
      decisionTitle: decision.title,
      finalBranchName: finalBranch.name,
      subDecisionCreated: !!subDecision,
    },
    createdAt: new Date().toISOString(),
  };

  events.push(resolveEvent);

  res.json({
    status: 'resolved',
    decisionId: req.params.id,
    finalBranchId,
    preConfidence: decision.preConfidence,
    postConfidence,
    confidenceDelta: postConfidence - decision.preConfidence,
    subDecision: subDecision ? {
      decisionId: subDecision.decisionId,
      title: subDecision.title,
      createdAt: subDecision.createdAt,
    } : null,
  });
});

// Get Decision Tree
app.get('/decisions/tree', (req, res) => {
  const userId = getUserId(req);
  const userDecisions = decisions.filter(d => d.userId === userId);
  
  // Build tree structure
  const buildTree = (parentId = null) => {
    return userDecisions
      .filter(d => d.parentDecisionId === parentId)
      .map(decision => ({
        decision,
        branches: branches.filter(b => b.decisionId === decision.decisionId),
        children: buildTree(decision.decisionId),
      }));
  };

  const tree = buildTree();
  const rootDecisions = tree.filter(node => !node.decision.parentDecisionId);
  
  // Calculate tree metrics
  const allDecisions = userDecisions;
  const maxDepth = Math.max(...allDecisions.map(d => {
    let depth = 0;
    let current = d;
    while (current.parentDecisionId) {
      depth++;
      current = allDecisions.find(d2 => d2.decisionId === current.parentDecisionId);
      if (!current) break;
    }
    return depth;
  }));

  res.json({
    rootDecision: rootDecisions[0]?.decision || null,
    nodes: rootDecisions,
    maxDepth: maxDepth + 1,
    totalDecisions: allDecisions.length,
  });
});

// Group Decisions
app.post('/decisions/group', (req, res) => {
  const userId = getUserId(req);
  const { decisionIds, groupName, groupDescription } = req.body;
  
  if (!decisionIds || decisionIds.length < 2) {
    return res.status(400).json({ error: 'At least 2 decisions are required to create a group' });
  }

  if (!groupName) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  // Verify all decisions belong to the user
  const userDecisions = decisions.filter(d => d.userId === userId);
  const validDecisions = decisionIds.filter(id => 
    userDecisions.some(d => d.decisionId === id)
  );

  if (validDecisions.length !== decisionIds.length) {
    return res.status(400).json({ error: 'Some decisions not found or do not belong to user' });
  }

  const group = {
    groupId: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    name: groupName,
    description: groupDescription || '',
    decisionIds: validDecisions,
    createdAt: new Date().toISOString(),
  };

  decisionGroups.push(group);

  res.json({
    groupId: group.groupId,
    name: group.name,
    description: group.description,
    decisionIds: group.decisionIds,
    createdAt: group.createdAt,
  });
});

// Get Decision Groups
app.get('/decisions/groups', (req, res) => {
  const userId = getUserId(req);
  const userGroups = decisionGroups.filter(g => g.userId === userId);
  
  const groupsWithDecisions = userGroups.map(group => ({
    ...group,
    decisions: decisions.filter(d => group.decisionIds.includes(d.decisionId)),
  }));

  res.json({
    groups: groupsWithDecisions,
    count: groupsWithDecisions.length,
  });
});

// Generate Path Forward - Now uses Claude API with fallback to mock responses
app.post('/generate-path-forward', async (req, res) => {
  const { originalDecision, chosenPath, pathDescription } = req.body;
  
  if (!originalDecision || !chosenPath || !pathDescription) {
    return res.status(400).json({ error: 'Original decision, chosen path, and path description are required' });
  }

  console.log('🚀 Generating path forward for:', { originalDecision, chosenPath, pathDescription });

  try {
    // Use the new implementation that tries Claude first, falls back to mock
    const pathForward = await generatePathForward(originalDecision, chosenPath, pathDescription);
    
    console.log('✅ Path forward generated successfully');
    res.json({ pathForward });
  } catch (error) {
    console.error('❌ Error generating path forward:', error);
    res.status(500).json({ 
      error: 'Failed to generate path forward',
      message: error.message 
    });
  }
});

// Check if clarification is needed
app.post('/check-clarification-needed', async (req, res) => {
  const { decisionTitle, decisionDescription } = req.body;
  
  if (!decisionTitle) {
    return res.status(400).json({ error: 'Decision title is required' });
  }

  try {
    console.log('🤖 Using Claude AI to check if clarification is needed for:', {
      decisionTitle,
      decisionDescription
    });

    // Use real Bedrock function
    const { checkClarificationNeeded } = require('./bedrock-js');
    const result = await checkClarificationNeeded(decisionTitle, decisionDescription || '');
    
    console.log('✅ Clarification check result:', result);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error checking clarification needs:', error);
    res.status(500).json({ error: 'Failed to check clarification needs' });
  }
});

// Generate Clarifying Questions
app.post('/generate-clarifying-questions', async (req, res) => {
  const { decisionTitle, decisionDescription } = req.body;
  
  if (!decisionTitle) {
    return res.status(400).json({ error: 'Decision title is required' });
  }

  try {
    console.log('🤖 Using Claude AI to generate clarifying questions for:', {
      decisionTitle,
      decisionDescription
    });

    // Use real Bedrock function
    const { generateClarifyingQuestions } = require('./bedrock-js');
    const result = await generateClarifyingQuestions(decisionTitle, decisionDescription || '');
    
    console.log('✅ Generated clarifying questions:', result);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error generating clarifying questions:', error);
    res.status(500).json({ error: 'Failed to generate clarifying questions' });
  }
});

// Generate Decision Summary
app.post('/generate-decision-summary', async (req, res) => {
  const { decisionTitle, originalDescription, userResponses } = req.body;
  
  if (!decisionTitle || !userResponses || !Array.isArray(userResponses)) {
    return res.status(400).json({ error: 'Decision title and user responses are required' });
  }

  try {
    console.log('🤖 Using Claude AI to generate decision summary for:', {
      decisionTitle,
      originalDescription,
      responseCount: userResponses.length
    });

    // Use real Bedrock function
    const { generateDecisionSummary } = require('./bedrock-js');
    const result = await generateDecisionSummary(decisionTitle, originalDescription || '', userResponses);
    
    console.log('✅ Generated decision summary:', result);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error generating decision summary:', error);
    res.status(500).json({ error: 'Failed to generate decision summary' });
  }
});

app.listen(port, () => {
  console.log(`🚀 BranchPoint API server running at http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🎯 Ready to handle decision branching requests!`);
});
