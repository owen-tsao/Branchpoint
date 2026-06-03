const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

// Initialize Bedrock client
const client = new BedrockRuntimeClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

/**
 * Generate path forward using Claude via AWS Bedrock
 * This is a safe implementation that falls back to mock responses if Bedrock fails
 */
const generatePathForwardWithClaude = async (originalDecision, chosenPath, pathDescription) => {
  console.log('🤖 Attempting to use Claude API for path forward generation...');
  
  const prompt = `You are a life coaching AI. Based on the user's original decision and their chosen follow-up path, create a detailed, actionable "Your Path Forward" plan.

Original Decision: "${originalDecision}"
Chosen Follow-up Path: "${chosenPath}"
Path Description: "${pathDescription}"

Create a comprehensive, specific plan that includes:

1. Action Plan: Detailed steps they should take, specific to their decision context and chosen path
2. Potential Outcomes: Realistic expectations of what they can achieve and when
3. Next Steps: 5 specific, numbered action items they can start immediately
4. Timeline: A realistic timeline with specific milestones
5. Resources: Specific tools, people, websites, or services they should use

Make it HIGHLY CONTEXTUAL to their specific decision and chosen path. For example:
- If they chose "Negotiate for Better Terms" for an oil field job, focus on oil industry-specific negotiation tactics
- If they chose "Starting a Family" after a marriage decision, focus on family planning and relationship dynamics
- If they chose "Develop New Skills" for a career change, focus on industry-specific skill development

Be specific, actionable, and realistic. Include concrete examples and industry-specific advice.

Output JSON matching this exact schema:
{
  "actionPlan": "Your detailed action plan here...",
  "potentialOutcomes": "Your potential outcomes here...",
  "nextSteps": "1) First step 2) Second step 3) Third step 4) Fourth step 5) Fifth step",
  "timeline": "Your timeline with specific milestones...",
  "resources": "Your specific resources and tools..."
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
    console.log('📡 Sending request to Claude via AWS Bedrock...');
    const response = await client.send(command);
    const content = response.output?.message?.content?.[0]?.text;
    
    if (!content) {
      throw new Error('No content in response from Claude');
    }
    
    console.log('✅ Received response from Claude');
    
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      actionPlan: parsed.actionPlan || 'Create a detailed plan for your chosen path.',
      potentialOutcomes: parsed.potentialOutcomes || 'You can expect positive changes within 3-6 months.',
      nextSteps: parsed.nextSteps || '1) Research your options 2) Set specific goals 3) Take action 4) Monitor progress 5) Adjust as needed',
      timeline: parsed.timeline || 'Month 1-2: Planning phase. Month 3-4: Implementation. Month 5-6: Evaluation.',
      resources: parsed.resources || 'Educational materials, mentors, professional networks, and relevant tools.'
    };
  } catch (error) {
    console.error('❌ Claude API error:', error.message);
    throw error; // Re-throw to trigger fallback
  }
};

/**
 * Fallback mock responses (same as original dev-server.js)
 */
const getMockPathForward = (originalDecision, chosenPath) => {
  console.log('🔄 Using mock response as fallback...');
  
  if (originalDecision.toLowerCase().includes('oil field') && chosenPath.toLowerCase().includes('negotiate')) {
    return {
      actionPlan: `For oil field negotiation, research current industry pay scales for your specific role and location. Study union contracts and safety pay structures. Document your experience with hazardous work conditions, certifications, and specialized skills. Prepare a detailed case for hazard pay, overtime rates, and safety bonuses.`,
      potentialOutcomes: `Successful negotiation in oil field work typically results in 15-25% higher base pay, improved safety pay rates, better overtime compensation, and enhanced benefits packages. You could see immediate financial gains within 1-2 months of starting negotiations.`,
      nextSteps: `1) Research current oil field pay scales on Rigzone and OilCareers 2) Join relevant unions like USW or IAM 3) Document all safety certifications and hazardous work experience 4) Schedule meeting with HR or supervisor 5) Present data-driven case for better compensation`,
      timeline: `Week 1-2: Research and data collection. Week 3-4: Prepare negotiation materials and schedule meetings. Week 5-6: Conduct negotiations and follow up. Month 2-3: Implement new compensation structure.`,
      resources: `Rigzone salary surveys, OilCareers job postings, USW union resources, OSHA safety training records, industry-specific negotiation guides, and local oil field worker networks.`
    };
  } else if (originalDecision.toLowerCase().includes('oil field') && chosenPath.toLowerCase().includes('accounting')) {
    return {
      actionPlan: `Transition from oil field to accounting requires obtaining CPA certification and relevant accounting experience. Start by taking accounting courses, gaining bookkeeping experience, and preparing for the CPA exam. Consider oil and gas accounting specialization for industry relevance.`,
      potentialOutcomes: `Accounting offers more stable income, better work-life balance, and long-term career growth. Starting salary may be lower initially, but CPA certification can lead to 6-figure salaries within 3-5 years.`,
      nextSteps: `1) Enroll in accounting courses or degree program 2) Gain bookkeeping experience 3) Study for CPA exam 4) Network with oil and gas accountants 5) Apply for entry-level accounting positions`,
      timeline: `Month 1-6: Complete accounting education. Month 7-12: Gain practical experience and study for CPA. Year 2: Pass CPA exam and secure accounting position. Year 3+: Advance in accounting career.`,
      resources: `AICPA resources, accounting degree programs, CPA exam prep courses, oil and gas accounting firms, professional accounting associations, and industry-specific accounting software training.`
    };
  } else {
    // Generic fallback
    return {
      actionPlan: `Based on your decision "${originalDecision}" and chosen path "${chosenPath}", here's your detailed action plan. Research industry-specific requirements and best practices. Network with professionals in this field. Create a step-by-step implementation plan with clear milestones.`,
      potentialOutcomes: `By pursuing "${chosenPath}" in the context of "${originalDecision}", you can expect to see positive changes within 3-6 months. This could include improved career prospects, better work-life balance, or increased earning potential.`,
      nextSteps: `1) Research specific requirements for "${chosenPath}" in your industry 2) Network with professionals who have made similar transitions 3) Create a detailed timeline with specific milestones 4) Start taking concrete action steps this week 5) Monitor progress and adjust your approach as needed`,
      timeline: `Month 1-2: Research and planning phase. Month 3-4: Active implementation and skill development. Month 5-6: Evaluation and refinement of your approach.`,
      resources: `Industry-specific job boards, professional associations, networking events, online courses, mentors in your field, and relevant certification programs.`
    };
  }
};

/**
 * Main function that tries Claude first, falls back to mock if needed
 */
const generatePathForward = async (originalDecision, chosenPath, pathDescription) => {
  try {
    // Try to use Claude API first
    return await generatePathForwardWithClaude(originalDecision, chosenPath, pathDescription);
  } catch (error) {
    console.warn('⚠️ Claude API unavailable, using mock response:', error.message);
    // Fall back to mock response
    return getMockPathForward(originalDecision, chosenPath);
  }
};

module.exports = { generatePathForward };

