// JavaScript version of Bedrock functions for dev-server
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function generateFollowUpDecisions(originalDecision, chosenPath, simulationResult, decisionContext) {
  const prompt = `You are a life simulation AI. Based on the user's original decision, their chosen path, and the simulation results, create a compelling storyline of their life journey and generate specific follow-up decisions.

Original Decision: "${originalDecision}"
Chosen Path: "${chosenPath}"
Simulation Results: ${JSON.stringify(simulationResult, null, 2)}
${decisionContext ? `Decision Context (Use this extensively): ${decisionContext}` : ''}

Create a detailed, specific storyline (2-3 paragraphs) showing how their life unfolds over 6-12 months after making this choice.

The storyline should be:
- HIGHLY SPECIFIC to their exact decision and choice
- Realistic and relatable with concrete details
- Show both positive and challenging aspects with specific examples
- Connect directly to the simulation results and their implications
- Set up the follow-up decisions naturally
- Include specific timeframes, emotions, and outcomes
- Be personal and engaging, not generic

Then generate 3-4 specific follow-up decisions that naturally arise from this storyline. These should be:
- Highly contextual to their specific situation and decision
- Realistic and actionable
- Different from generic categories - be specific
- Based on the storyline and simulation results
- Show different paths they could take next

Examples of specific vs generic follow-up decisions:
- SPECIFIC: "Negotiate for a 20% salary increase based on your 6-month performance review" vs GENERIC: "Continue Current Path"
- SPECIFIC: "Start couples therapy to address the communication issues that emerged" vs GENERIC: "Pivot Strategy"
- SPECIFIC: "Apply for the senior developer position that opened up in your team" vs GENERIC: "Explore New Opportunities"

Output JSON matching this exact schema:
{
  "storyline": "Your detailed, specific storyline here...",
  "followUpDecisions": [
    {"name": "Specific decision 1", "description": "Detailed description of what this involves"},
    {"name": "Specific decision 2", "description": "Detailed description of what this involves"},
    {"name": "Specific decision 3", "description": "Detailed description of what this involves"}
  ]
}`;

  const command = new ConverseCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    messages: [
      {
        role: 'user',
        content: [
          {
            text: prompt
          }
        ]
      }
    ],
  });

  try {
    const response = await client.send(command);
    const content = response.output?.message?.content?.[0]?.text;
    
    if (!content) {
      throw new Error('No content in response');
    }
    
    // Try to find JSON in the response, handling potential control characters
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    // Clean the JSON string by removing control characters
    const cleanedJson = jsonMatch[0]
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs
    
    const parsed = JSON.parse(cleanedJson);
    
    // Return AI-generated storyline and follow-up decisions
    return {
      storyline: parsed.storyline || 'Your journey continues...',
      followUpDecisions: parsed.followUpDecisions || [
        {
          name: 'Continue Current Path',
          description: 'Stay committed to your chosen direction and see where it leads'
        },
        {
          name: 'Pivot Strategy',
          description: 'Adjust your approach based on new information and experiences'
        },
        {
          name: 'Explore New Opportunities',
          description: 'Look for additional options that have emerged from your choice'
        }
      ]
    };
  } catch (error) {
    console.error('Bedrock follow-up decisions error:', error);
    // Fallback response with hardcoded categories
    return {
      storyline: `After choosing "${chosenPath}", your life takes an interesting turn. The decision brings both expected and unexpected changes, opening new doors while presenting fresh challenges. You find yourself at a crossroads, ready to make the next important choice in your journey.`,
      followUpDecisions: [
        {
          name: 'Continue Current Path',
          description: 'Stay committed to your chosen direction and see where it leads'
        },
        {
          name: 'Pivot Strategy',
          description: 'Adjust your approach based on new information and experiences'
        },
        {
          name: 'Explore New Opportunities',
          description: 'Look for additional options that have emerged from your choice'
        }
      ]
    };
  }
}

async function checkClarificationNeeded(decisionTitle, decisionDescription) {
  const prompt = `You are an AI assistant that analyzes decisions to determine if there's enough context for realistic simulation.

The user has shared this decision:
Title: "${decisionTitle}"
Description: "${decisionDescription}"

Your task is to determine if this decision has enough specific details to create a meaningful, realistic simulation of the different choice paths. Consider:

1. **Specificity**: Are the options clearly defined and specific enough?
2. **Context**: Is there enough background information about the user's situation?
3. **Constraints**: Are important factors like timeline, budget, location, etc. mentioned?
4. **Stakes**: Is it clear what the consequences of each choice might be?
5. **Simulation Quality**: Could you realistically simulate what life would be like 1 year after each choice?

Examples of decisions that NEED clarification:
- "Should I go to UW or Purdue?" (missing: major, financial situation, career goals, location preferences)
- "Should I take the job offer?" (missing: current job details, salary, location, company culture)
- "Should I move to a new city?" (missing: which city, current situation, reasons for moving)
- "Should I start a business?" (missing: what type of business, current financial situation, experience)

Examples of decisions that DON'T need clarification:
- "Should I take the $120k software engineer job at Google in Seattle or the $100k job at Microsoft in Redmond?" (very specific)
- "Should I major in Computer Science at UW or Electrical Engineering at Purdue, given that I want to work in tech and both schools offer similar programs?" (specific with context)

Output JSON matching this exact schema:
{
  "needsClarification": true/false,
  "reason": "Brief explanation of why clarification is or isn't needed"
}`;

  const command = new ConverseCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    messages: [
      {
        role: 'user',
        content: [
          {
            text: prompt
          }
        ]
      }
    ]
  });

  try {
    const response = await client.send(command);
    const content = response.output?.message?.content?.[0]?.text;
    
    if (!content) {
      throw new Error('No content in response');
    }
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    // Clean the JSON string by removing control characters
    const cleanedJson = jsonMatch[0]
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs
    
    const parsed = JSON.parse(cleanedJson);
    
    return {
      needsClarification: parsed.needsClarification || false,
      reason: parsed.reason || 'Insufficient context for realistic simulation'
    };
  } catch (error) {
    console.error('Bedrock clarification check error:', error);
    // Fallback: be conservative and ask for clarification
    return {
      needsClarification: true,
      reason: 'Unable to analyze decision context'
    };
  }
}

async function generateClarifyingQuestions(decisionTitle, decisionDescription) {
  const prompt = `You are a helpful AI assistant that generates clarifying questions to enable realistic decision simulation.

The user has shared this decision:
Title: "${decisionTitle}"
Description: "${decisionDescription}"

Based on the decision title and description, generate 3-5 specific, thoughtful clarifying questions that would help create a realistic simulation of each choice path. Focus on gathering information that would be essential for simulating what life would be like 1 year after making each choice.

The questions should help uncover:
- **Specific details** about each option (majors, salaries, locations, timelines, etc.)
- **Personal context** (current situation, goals, constraints, preferences)
- **Important factors** that would affect the simulation (financial situation, family considerations, career aspirations)
- **Missing information** needed to realistically compare the options

Examples of good clarifying questions:
- "What major did you get into each school for?" (for college decisions)
- "What's the salary difference between the two job offers?" (for career decisions)
- "What's your current financial situation and how would this decision affect it?" (for financial decisions)
- "What are your main priorities - career growth, work-life balance, or financial stability?" (for general decisions)

The questions should be:
- Specific and actionable
- Focused on simulation-relevant details
- Conversational and empathetic in tone
- Not leading toward any particular outcome

Output JSON matching this exact schema:
{
  "questions": ["question1", "question2", "question3", "question4", "question5"]
}`;

  const command = new ConverseCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    messages: [
      {
        role: 'user',
        content: [
          {
            text: prompt
          }
        ]
      }
    ]
  });

  try {
    const response = await client.send(command);
    const content = response.output?.message?.content?.[0]?.text;
    
    if (!content) {
      throw new Error('No content in response');
    }
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    // Clean the JSON string by removing control characters
    const cleanedJson = jsonMatch[0]
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs
    
    const parsed = JSON.parse(cleanedJson);
    
    return {
      questions: parsed.questions || []
    };
  } catch (error) {
    console.error('Bedrock clarifying questions error:', error);
    // Fallback questions
    return {
      questions: [
        "What's the main reason you're considering this decision right now?",
        "What are the most important factors you're weighing?",
        "What would success look like for you in this situation?",
        "What concerns or fears do you have about this decision?",
        "How does this decision fit into your broader life goals?"
      ]
    };
  }
}

async function generateDecisionSummary(decisionTitle, originalDescription, userResponses) {
  const responsesText = userResponses
    .map((r, i) => `Q${i + 1}: ${r.question}\nA${i + 1}: ${r.answer}`)
    .join('\n\n');

  const prompt = `You are a helpful AI assistant that creates clear, comprehensive decision summaries.

Original Decision:
Title: "${decisionTitle}"
Description: "${originalDescription}"

User's Clarifying Responses:
${responsesText}

Based on the original decision and the user's detailed responses, create:
1. A conversational summary that shows you understand their situation
2. An enhanced description that incorporates all the context they've provided

The summary should:
- Start with "Here's what I understand about your situation..."
- Be empathetic and show you've listened carefully
- Synthesize the key points from their responses
- Be conversational, not formal
- Highlight the most important factors they've mentioned

The enhanced description should:
- Incorporate all the context from their responses
- Be more detailed and specific than the original
- Maintain their voice and perspective
- Be ready to use for decision analysis

Output JSON matching this exact schema:
{
  "summary": "Here's what I understand about your situation...",
  "enhancedDescription": "Enhanced description incorporating all context..."
}`;

  const command = new ConverseCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    messages: [
      {
        role: 'user',
        content: [
          {
            text: prompt
          }
        ]
      }
    ]
  });

  try {
    const response = await client.send(command);
    const content = response.output?.message?.content?.[0]?.text;
    
    if (!content) {
      throw new Error('No content in response');
    }
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    // Clean the JSON string by removing control characters
    const cleanedJson = jsonMatch[0]
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs
    
    const parsed = JSON.parse(cleanedJson);
    
    return {
      summary: parsed.summary || "Here's what I understand about your situation...",
      enhancedDescription: parsed.enhancedDescription || originalDescription
    };
  } catch (error) {
    console.error('Bedrock decision summary error:', error);
    // Fallback summary
    return {
      summary: "Here's what I understand about your situation...",
      enhancedDescription: originalDescription
    };
  }
}

async function generateSimulation(decisionTitle, branchName, branchDescription, personaStyle = 'analytical', decisionDescription) {
  const prompt = `You are Future-You one year from now. You experienced choosing "${branchName}" for the decision "${decisionTitle}". 

DECISION CONTEXT (CRITICAL - Use this extensively):
${decisionDescription || 'No additional context provided'}

BRANCH DESCRIPTION:
${branchDescription}

INSTRUCTIONS:
- The decision context above contains detailed information about the user's specific situation, motivations, background, and circumstances gathered through AI clarifying questions
- Use this context extensively to create a highly personalized and realistic simulation
- Reference specific details from the decision context in your scenarios and questions
- Show that you understand their unique situation, not just generic advice
- Make the simulation feel like it's truly about THEIR specific decision and circumstances

Create a first-person reflection that demonstrates deep understanding of their situation. Produce 5 probing questions that would have helped you make this choice, an optimistic scenario (short paragraph), a challenging scenario (short paragraph), and a short summary of the major tradeoffs.

Persona Style: ${personaStyle === 'analytical' ? 'Focus on data, metrics, and logical analysis' : 'Focus on emotions, relationships, and personal impact'}

Output JSON matching this exact schema:
{
  "questions": ["question1", "question2", "question3", "question4", "question5"],
  "optimistic_scenario": "In one year, after choosing this path...",
  "challenging_scenario": "In one year, after choosing this path, the challenges...",
  "summary": "Major tradeoffs: ...",
  "confidence_delta_recommendation": 0.5
}`;

  const command = new ConverseCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    messages: [
      {
        role: 'user',
        content: [
          {
            text: prompt
          }
        ]
      }
    ]
  });

  try {
    const response = await client.send(command);
    const content = response.output?.message?.content?.[0]?.text;
    
    if (!content) {
      throw new Error('No content in response');
    }
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      questions: parsed.questions || [],
      optimistic_scenario: parsed.optimistic_scenario || 'In one year, after choosing this path, I found it provided the structure I needed.',
      challenging_scenario: parsed.challenging_scenario || 'In one year, after choosing this path, I faced some unexpected challenges.',
      summary: parsed.summary || 'Major tradeoffs: Structure vs. flexibility, planning vs. spontaneity.',
      confidence_delta_recommendation: parsed.confidence_delta_recommendation || 0.5
    };
  } catch (error) {
    console.error('Bedrock simulation error:', error);
    // Fallback simulation
    return {
      questions: [
        'What are the key benefits of this choice?',
        'What challenges might I face?',
        'How will this impact my long-term goals?',
        'What support will I need?',
        'How will I measure success?'
      ],
      optimistic_scenario: `In one year, after choosing "${branchName}", I found that this path provided the structure and direction I needed.`,
      challenging_scenario: `In one year, after choosing "${branchName}", I faced some unexpected challenges that required adaptation.`,
      summary: 'Major tradeoffs: Structure vs. flexibility, planning vs. spontaneity.',
      confidence_delta_recommendation: 0.5
    };
  }
}

module.exports = {
  generateFollowUpDecisions,
  checkClarificationNeeded,
  generateClarifyingQuestions,
  generateDecisionSummary,
  generateSimulation
};
