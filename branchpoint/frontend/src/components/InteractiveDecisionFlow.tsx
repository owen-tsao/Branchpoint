import React, { useState, useEffect } from 'react';
import { Decision, Branch } from '../types';
import { apiClient } from '../api';
import { Brain, ArrowRight, Zap, MessageCircle, Clock, CheckCircle, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

interface InteractiveDecisionFlowProps {
  decision: Decision;
  branches: Branch[];
  onDecisionComplete?: (finalChoice: string, simulation: any) => void;
}

interface DecisionStep {
  id: string;
  type: 'question' | 'choice' | 'simulation' | 'result' | 'storyline' | 'followup';
  title: string;
  content: string;
  choices?: Array<{
    id: string;
    text: string;
    description: string;
    branchId?: string;
  }>;
  selectedChoice?: string;
  simulation?: any;
  followUpDecisions?: Array<{
    name: string;
    description: string;
  }>;
  timestamp: string;
}

export const InteractiveDecisionFlow: React.FC<InteractiveDecisionFlowProps> = ({
  decision,
  branches,
  onDecisionComplete
}) => {
  const [steps, setSteps] = useState<DecisionStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [chosenPath, setChosenPath] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);

  useEffect(() => {
    initializeFlow();
  }, [decision, branches]);

  useEffect(() => {
    // Use existing branches if available, otherwise generate default ones
    if (branches.length > 0) {
      useExistingBranches();
    } else {
      generateInitialBranches();
    }
  }, [branches.length]);

  const initializeFlow = () => {
    const initialStep: DecisionStep = {
      id: 'intro',
      type: 'question',
      title: 'Welcome to Your Decision Journey',
      content: `Let's explore your decision: "${decision.title}". I'll guide you through the different paths and help you understand the potential outcomes.`,
      timestamp: new Date().toISOString()
    };
    setSteps([initialStep]);
    setCurrentStep(0);
    
    // If branches exist, use them immediately
    if (branches.length > 0) {
      useExistingBranches();
    }
  };

  const useExistingBranches = () => {
    console.log('Using existing branches:', branches);
    
    // Convert existing branches to choice format
    const branchChoices = branches.map((branch, index) => ({
      id: branch.branchId || `branch-${index}`,
      text: branch.name,
      description: branch.description,
      branchId: branch.branchId
    }));
    
    console.log('Converted to choices:', branchChoices);
    
    // Update the initial step with existing branch choices
    setSteps(prev => {
      const updatedSteps = [...prev];
      updatedSteps[0] = {
        ...updatedSteps[0],
        choices: branchChoices
      };
      return updatedSteps;
    });
  };

  const generateInitialBranches = async () => {
    try {
      console.log('🤖 Generating AI branches for decision:', decision.title);
      
      // Call the AI to generate decision-specific branches
      const response = await apiClient.generateBranches(decision.title, decision.description || '');
      
      console.log('✅ AI generated branches:', response.branches);
      
      // Convert AI branches to choice format
      const aiChoices = response.branches.map((branch, index) => ({
        id: `ai-branch-${index}`,
        text: branch.name,
        description: branch.description,
        branchId: `ai-${Date.now()}-${index}`
      }));
      
      // Update the initial step with AI-generated choices
      setSteps(prev => {
        const updatedSteps = [...prev];
        updatedSteps[0] = {
          ...updatedSteps[0],
          choices: aiChoices
        };
        return updatedSteps;
      });
    } catch (error) {
      console.error('❌ Error generating AI branches:', error);
      
      // Fallback to generic choices if AI fails
      const fallbackChoices = [
        {
          id: 'yes',
          text: 'Yes - Take Action',
          description: 'Move forward with this decision and embrace the opportunities it brings'
        },
        {
          id: 'no',
          text: 'No - Wait or Decline',
          description: 'Hold off on this decision and explore alternative options'
        }
      ];
      
      setSteps(prev => {
        const updatedSteps = [...prev];
        updatedSteps[0] = {
          ...updatedSteps[0],
          choices: fallbackChoices
        };
        return updatedSteps;
      });
    }
  };


  const handleChoiceSelect = async (choice: any) => {
    setSelectedChoice(choice.id);
    setIsProcessing(true);

    // Add choice step
    const choiceText = choice.text || choice.name || 'your selected option';
    setChosenPath(choiceText); // Store the chosen path for context
    
    const choiceStep: DecisionStep = {
      id: `choice-${Date.now()}`,
      type: 'choice',
      title: 'Your Choice',
      content: `You've chosen: "${choiceText}"`,
      selectedChoice: choice.id,
      timestamp: new Date().toISOString()
    };

    setSteps(prev => [...prev, choiceStep]);
    setCurrentStep(prev => prev + 1);

    // Simulate the choice
    await simulateChoice(choice);
  };


  const simulateChoice = async (choice: any) => {
    try {
      console.log('Starting simulation for choice:', choice);
      
      // Add simulation step
      const simulationStep: DecisionStep = {
        id: `simulation-${Date.now()}`,
        type: 'simulation',
        title: 'Simulating Your Future',
        content: 'Running AI simulation based on your choice...',
        timestamp: new Date().toISOString()
      };

      setSteps(prev => [...prev, simulationStep]);
      setCurrentStep(prev => prev + 1);

      // Use real AWS Lambda simulation
      const choiceText = choice.text || choice.name || 'your selected option';
      const choiceDescription = choice.description || 'A decision option';
      console.log('Using real AWS Lambda simulation:', { decisionTitle: decision.title, choiceText, choiceDescription });
      
      // First verify the decision exists in the backend
      try {
        await apiClient.getDecision(decision.decisionId);
      } catch (error) {
        console.error('Decision not found in backend:', error);
        toast.error('Decision not found. Please refresh the page and try again.');
        return;
      }
      
      // First create a real branch for this choice
      const branchResponse = await apiClient.createBranch(decision.decisionId, {
        name: choiceText,
        description: choiceDescription
      });
      
      console.log('Created branch:', branchResponse);
      
      // Now simulate the real branch
      const response = await apiClient.simulateBranch({
        branchId: branchResponse.branchId,
        personaStyle: 'analytical'
      }, decision.userId);
      
      console.log('Claude simulation result:', response);
      
      const simulationResult = response.simulationOutput;

      // Generate storyline and follow-up decisions using real API
      console.log('Generating storyline and follow-up decisions...');
      const followUpResponse = await apiClient.generateFollowUpDecisions(
        decision.title,
        choiceText,
        simulationResult,
        decision.description // Pass the enhanced description as context
      );
      
          console.log('Follow-up response:', followUpResponse);

      // Add storyline step
      const storylineStep: DecisionStep = {
        id: `storyline-${Date.now()}`,
        type: 'storyline',
        title: 'Your Life Storyline',
        content: followUpResponse.storyline,
        timestamp: new Date().toISOString()
      };

      // Add result step with simulation
      const resultStep: DecisionStep = {
        id: `result-${Date.now()}`,
        type: 'result',
        title: 'Simulation Results',
        content: generateSimulationSummary(simulationResult, choice),
        simulation: simulationResult,
        timestamp: new Date().toISOString()
      };

      // Use AI-generated follow-up decisions from the API response
      const whatsNextStep: DecisionStep = {
        id: `whats-next-${Date.now()}`,
        type: 'followup',
        title: 'What\'s Next?',
        content: 'Based on your choice, here are some follow-up decisions you might face:',
        followUpDecisions: followUpResponse.followUpDecisions,
        timestamp: new Date().toISOString()
      };

      // Add all steps but only advance to the first one
      setSteps(prev => [...prev, storylineStep, resultStep, whatsNextStep]);
      
      console.log('Added steps:', { storylineStep, resultStep, whatsNextStep });
      console.log('What\'s Next decisions:', followUpResponse.followUpDecisions);
      
      // Show storyline step first
      setCurrentStep(prev => prev + 1);

      if (onDecisionComplete) {
        onDecisionComplete(choiceText, simulationResult);
      }

      toast.success('Simulation and storyline completed!');
    } catch (error) {
      console.error('Error simulating choice:', error);
      toast.error('Failed to simulate choice');
    } finally {
      setIsProcessing(false);
    }
  };



  const generateMockSimulation = async (decisionTitle: string, branchName: string, branchDescription: string, personaStyle: 'analytical' | 'empathetic' = 'analytical') => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const choiceText = branchName;
    const decisionTitleLower = decisionTitle.toLowerCase();
    
    console.log('Generating simulation for:', { decisionTitle, branchName, branchDescription, choiceText });
    
    // Generate context-specific responses based on the choice and decision
    let optimisticScenario, challengingScenario, summary, confidenceDelta;
    
    if (decisionTitleLower.includes('invest') && decisionTitleLower.includes('money')) {
      const isConservative = choiceText.toLowerCase().includes('conservative') || choiceText.includes('1000');
      const isAggressive = choiceText.toLowerCase().includes('aggressive') || choiceText.includes('10000');
      
      if (isConservative) {
        optimisticScenario = `By choosing the conservative investment approach, you've prioritized financial stability and peace of mind. In the best case, your $1000 investment grows steadily over time, providing a solid foundation for future financial goals without the stress of market volatility. You sleep better at night knowing your money is relatively safe.`;
        challengingScenario = `The main challenge with conservative investing is that your returns may not keep pace with inflation, and you might miss out on significant growth opportunities. You may feel frustrated watching others achieve higher returns, and your money might not grow as quickly as you'd hoped.`;
        summary = `This conservative choice shows financial prudence and risk awareness. It's perfect if you value stability over growth and want to protect your capital.`;
        confidenceDelta = 0.3; // Conservative choices typically increase confidence
      } else if (isAggressive) {
        optimisticScenario = `By choosing aggressive investing, you're positioning yourself for potentially significant returns. In the best case, your $10,000 investment could grow substantially, potentially doubling or tripling over time. You're taking calculated risks that could pay off handsomely and accelerate your wealth building.`;
        challengingScenario = `The main challenge is dealing with market volatility and potential losses. You might see your investment drop significantly during market downturns, which can be emotionally difficult. You'll need to stay committed during tough times and not panic-sell.`;
        summary = `This aggressive choice shows confidence in your risk tolerance and long-term vision. It's ideal if you can handle volatility and have time to recover from potential losses.`;
        confidenceDelta = 0.1; // Aggressive choices might slightly increase confidence
      }
    } else if (decisionTitleLower.includes('quit') && decisionTitleLower.includes('job')) {
      const isQuit = choiceText.toLowerCase().includes('quit') || choiceText.toLowerCase().includes('yes');
      
      if (isQuit) {
        optimisticScenario = `By choosing to quit your job, you're taking control of your career and opening doors to new opportunities. In the best case, you find a better position with higher pay, better work-life balance, or pursue your passion. You feel liberated and excited about the future possibilities.`;
        challengingScenario = `The main challenges include financial uncertainty during the job search, potential gaps in employment, and the stress of finding a new position. You might face rejection and need to be patient while building new connections and skills.`;
        summary = `This bold choice shows courage and self-advocacy. It's perfect if you're ready for change and have a plan for your next steps.`;
        confidenceDelta = 0.4; // Quitting takes courage and increases confidence
      } else {
        optimisticScenario = `By choosing to stay in your current job, you're prioritizing stability and security. In the best case, you can work on improving your current situation, negotiate better terms, or develop new skills while maintaining your income. You avoid the stress of job searching and maintain your routine.`;
        challengingScenario = `The main challenge is that you might feel stuck or unfulfilled, and the same problems that made you consider quitting will likely persist. You might miss out on better opportunities and feel regret later.`;
        summary = `This cautious choice shows practical thinking and risk management. It's ideal if you need more time to plan or have financial constraints.`;
        confidenceDelta = -0.1; // Staying might slightly decrease confidence
      }
    } else {
      // Generic but still choice-specific responses
      // Try to detect if it's a "yes" or "no" type choice
      const isPositiveChoice = choiceText.toLowerCase().includes('yes') || 
                              choiceText.toLowerCase().includes('proceed') || 
                              choiceText.toLowerCase().includes('take') ||
                              choiceText.toLowerCase().includes('go');
      
      if (isPositiveChoice) {
        optimisticScenario = `By choosing "${choiceText}", you're taking a proactive step toward your goals. In the best case, this decision opens up new opportunities, helps you grow personally and professionally, and brings you closer to the life you want to live. You feel empowered and excited about the future.`;
        challengingScenario = `The main challenges with this choice include dealing with uncertainty, potential setbacks, and the need to stay committed when things get difficult. You might face resistance from others or unexpected obstacles that test your resolve.`;
        summary = `This choice demonstrates your willingness to take action and make decisions that align with your values. It shows courage and self-awareness in pursuing what matters to you.`;
        confidenceDelta = 0.4; // Positive choices increase confidence
      } else {
        optimisticScenario = `By choosing "${choiceText}", you're taking a cautious and thoughtful approach. In the best case, this decision protects you from potential risks while still allowing for growth and opportunity. You feel secure and confident in your measured approach.`;
        challengingScenario = `The main challenges with this choice include potential missed opportunities and the risk of being too conservative. You might wonder if you're being overly cautious and whether you're limiting your potential for growth.`;
        summary = `This choice demonstrates careful consideration and risk management. It shows wisdom in taking a measured approach and prioritizing stability over rapid change.`;
        confidenceDelta = 0.2; // Cautious choices slightly increase confidence
      }
    }
    
    return {
      questions: [
        "What specific challenges might you face with this choice?",
        "How will this decision impact your daily life and relationships?",
        "What opportunities might this open up for you in the next 6 months?"
      ],
      optimisticScenario,
      challengingScenario,
      summary,
      confidenceDeltaRecommendation: confidenceDelta
    };
  };

  const generateSimulationSummary = (simulation: any, choice: any) => {
    const choiceText = choice.text || choice.name || 'your selected option';
    return `
      <div class="space-y-4">
        <h4 class="font-semibold text-lg">Future Simulation: "${choiceText}"</h4>
        
        <div class="bg-blue-50 p-4 rounded-lg">
          <h5 class="font-medium text-blue-900 mb-2">Optimistic Scenario</h5>
          <p class="text-blue-800 text-sm">${simulation.optimisticScenario}</p>
        </div>
        
        <div class="bg-orange-50 p-4 rounded-lg">
          <h5 class="font-medium text-orange-900 mb-2">Challenges to Consider</h5>
          <p class="text-orange-800 text-sm">${simulation.challengingScenario}</p>
        </div>
        
        <div class="bg-green-50 p-4 rounded-lg">
          <h5 class="font-medium text-green-900 mb-2">Key Insights</h5>
          <p class="text-green-800 text-sm">${simulation.summary}</p>
        </div>
        
        <div class="text-center">
          <p class="text-sm text-gray-600">
            Confidence Impact: ${simulation.confidenceDeltaRecommendation > 0 ? '+' : ''}${simulation.confidenceDeltaRecommendation?.toFixed(1)} points
          </p>
        </div>
      </div>
    `;
  };

  const generateFollowUpSimulation = async (followUp: any) => {
    try {
      // Use Claude to generate detailed follow-up simulation
      const response = await apiClient.generateFollowUpSimulation(
        decision.title,
        followUp.name,
        followUp.description
      );
      return response.simulation;
    } catch (error) {
      console.error('Error generating follow-up simulation:', error);
      // Generate contextual fallback simulation based on the specific choice
      return generateContextualFollowUpSimulation(followUp, chosenPath);
    }
  };


  const handleFollowUpSelect = async (followUp: any) => {
    console.log('handleFollowUpSelect called with:', followUp);
    setIsProcessing(true);

    try {
      // Generate "Your Path Forward" content using AI API
      console.log('Generating AI path forward for:', { 
        originalDecision: decision.title, 
        chosenPath: followUp.name, 
        followUpDescription: followUp.description 
      });
      
      const pathForwardResponse = await apiClient.generatePathForward(
        decision.title,
        followUp.name,
        followUp.description
      );

      console.log('AI Path Forward Response:', pathForwardResponse);
      const pathForwardContent = pathForwardResponse.pathForward;

      const pathForwardStep: DecisionStep = {
        id: `path-forward-${Date.now()}`,
        type: 'result',
        title: 'Your Path Forward',
        content: generateFollowUpSummary(pathForwardContent, followUp),
        simulation: pathForwardContent,
        timestamp: new Date().toISOString()
      };

      // Remove any existing "Your Path Forward" steps and add the new one
      setSteps(prev => {
        const filteredSteps = prev.filter(step => step.title !== 'Your Path Forward');
        const newSteps = [...filteredSteps, pathForwardStep];
        // Set current step to the new "Your Path Forward" step
        setCurrentStep(newSteps.length - 1);
        return newSteps;
      });
    } catch (error) {
      console.error('Error generating AI path forward:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Fallback to local generation if AI fails
      console.log('Falling back to local generation for:', followUp.name);
      const pathForwardContent = generateContextualFollowUpSimulation(followUp, chosenPath);

      const pathForwardStep: DecisionStep = {
        id: `path-forward-${Date.now()}`,
        type: 'result',
        title: 'Your Path Forward',
        content: generateFollowUpSummary(pathForwardContent, followUp),
        simulation: pathForwardContent,
        timestamp: new Date().toISOString()
      };

      setSteps(prev => {
        const filteredSteps = prev.filter(step => step.title !== 'Your Path Forward');
        const newSteps = [...filteredSteps, pathForwardStep];
        setCurrentStep(newSteps.length - 1);
        return newSteps;
      });
    }

    setIsProcessing(false);
  };

  const generateContextualFollowUpSimulation = (choice: any, chosenPath?: string) => {
    const choiceName = choice.name.toLowerCase();
    const choiceDescription = (choice.description || '').toLowerCase();
    const combinedText = `${choiceName} ${choiceDescription}`;
    const pathContext = chosenPath?.toLowerCase() || '';
    
    console.log('Generating follow-up simulation for:', { choiceName, choiceDescription, combinedText, pathContext });
    
    // Generate detailed, specific content based on the exact choice
    
    // Career-specific patterns
    if (choiceName.includes('legal specialization') || choiceName.includes('legal') || combinedText.includes('legal') || combinedText.includes('lawyer') || combinedText.includes('law')) {
      return {
        actionPlan: `Research different areas of law to find your specialization. Consider your interests, values, and career goals. Shadow attorneys in different fields, attend legal seminars, and join law school organizations. Take relevant courses and internships in your chosen area. Build relationships with practicing attorneys in your field of interest.`,
        potentialOutcomes: `Within 6-12 months, you'll have a clear direction for your legal career. You'll gain specialized knowledge and connections in your chosen field. This focus will make you more attractive to employers and help you build expertise that leads to better opportunities and higher earning potential.`,
        nextSteps: `1) Research different legal specializations and their requirements 2) Shadow attorneys in various practice areas 3) Take relevant courses or electives in your chosen field 4) Join law school organizations related to your interest 5) Seek internships or clerkships in your target specialization`,
        timeline: `Month 1-3: Research and exploration phase. Month 4-6: Focused coursework and networking. Month 7-9: Internships and practical experience. Month 10-12: Job search and specialization preparation.`,
        resources: `Legal career guides, law school career services, professional associations (ABA, state bar associations), legal internships, and mentorship from practicing attorneys.`
      };
    } else if (choiceName.includes('build your professional network') || choiceName.includes('professional network') || choiceName.includes('network')) {
      // Check the path context to provide appropriate career-specific advice
      if (pathContext.includes('legal') || pathContext.includes('lawyer') || pathContext.includes('law')) {
        return {
          actionPlan: `Build your legal professional network by joining law school organizations, attending legal conferences and seminars, and connecting with practicing attorneys. Create a strong LinkedIn profile highlighting your legal interests and experiences. Seek out mentors in your chosen area of law and participate in local bar association events.`,
          potentialOutcomes: `Within 3-6 months, you'll have a solid foundation of legal professional connections. This network will provide valuable insights into different practice areas, potential job opportunities, and mentorship relationships. A strong professional network is crucial for success in the legal field and can lead to internships, clerkships, and job offers.`,
          nextSteps: `1) Join law school organizations like the American Bar Association Law Student Division 2) Attend local bar association events and legal conferences 3) Create a professional LinkedIn profile showcasing your legal interests 4) Seek out mentors in your chosen practice area 5) Participate in law school networking events and career fairs`,
          timeline: `Month 1-2: Join organizations and create online presence. Month 3-4: Attend events and begin networking. Month 5-6: Build relationships and seek mentorship opportunities.`,
          resources: `American Bar Association, state bar associations, law school career services, legal conferences, LinkedIn, and local bar association events.`
        };
      } else if (pathContext.includes('medical') || pathContext.includes('doctor') || pathContext.includes('medicine')) {
        return {
          actionPlan: `Build your medical professional network by connecting with current medical students, residents, and practicing physicians. Attend medical school fairs and information sessions, join pre-medical or medical student organizations, and seek shadowing or volunteer opportunities at local hospitals or clinics.`,
          potentialOutcomes: `Within 3-6 months, you'll have valuable connections in the medical field. This network will provide insights into the medical school application process, different specialties, and the day-to-day life of a physician. You may secure letters of recommendation, mentorship opportunities, and potentially even job shadowing or internship positions.`,
          nextSteps: `1) Research and join relevant student organizations, such as the American Medical Student Association or your university's pre-med club 2) Attend medical school fairs and information sessions to connect with representatives and current students 3) Seek out shadowing or volunteer opportunities at local hospitals or clinics 4) Create a professional online presence (e.g., LinkedIn profile) to connect with medical professionals 5) Attend local or regional medical conferences or seminars`,
          timeline: `Month 1-2: Join organizations and create online presence. Month 3-4: Attend events and begin networking. Month 5-6: Build relationships and seek mentorship opportunities.`,
          resources: `American Medical Student Association, medical school career services, hospital volunteer programs, medical conferences, LinkedIn, and local medical associations.`
        };
      } else {
        // Generic professional networking advice
        return {
          actionPlan: `Build your professional network by joining industry organizations, attending conferences and networking events, and connecting with professionals in your field. Create a strong LinkedIn profile and seek out mentors who can guide your career development.`,
          potentialOutcomes: `Within 3-6 months, you'll have a solid foundation of professional connections. This network will provide valuable insights into your industry, potential job opportunities, and mentorship relationships that can accelerate your career growth.`,
          nextSteps: `1) Join relevant professional organizations in your field 2) Attend industry conferences and networking events 3) Create a professional LinkedIn profile 4) Seek out mentors in your chosen career path 5) Participate in local professional meetups and events`,
          timeline: `Month 1-2: Join organizations and create online presence. Month 3-4: Attend events and begin networking. Month 5-6: Build relationships and seek mentorship opportunities.`,
          resources: `Professional associations, industry conferences, LinkedIn, local networking events, and mentorship programs.`
        };
      }
    } else if (choiceName.includes('bar exam') || choiceName.includes('bar') || combinedText.includes('bar exam')) {
      return {
        actionPlan: `Create a comprehensive study plan for the bar exam. Choose a reputable bar prep course and stick to their schedule. Focus on the subjects tested in your state, practice with sample questions, and take multiple practice exams. Join a study group for motivation and support. Manage your time effectively and maintain a healthy study-life balance.`,
        potentialOutcomes: `Within 2-3 months of focused study, you'll be prepared to pass the bar exam. Success will allow you to practice law and open doors to various legal career opportunities. Passing on the first attempt will save time and money, while demonstrating your competence to potential employers.`,
        nextSteps: `1) Choose and enroll in a bar prep course 2) Create a detailed study schedule 3) Gather all necessary study materials 4) Join a study group or find study partners 5) Take practice exams regularly and review weak areas`,
        timeline: `Month 1: Course enrollment and initial preparation. Month 2: Intensive study and practice exams. Month 3: Final review and exam preparation. Month 4: Bar exam and results waiting period.`,
        resources: `Bar prep courses (Barbri, Kaplan, Themis), practice exam materials, study groups, bar exam forums, and mentorship from recent bar exam passers.`
      };
    } else if (choiceName.includes('oil field') || combinedText.includes('oil field') || combinedText.includes('oilfield')) {
      return {
        actionPlan: `Research oil field companies and job opportunities in your area. Get the necessary safety certifications (OSHA, H2S, First Aid) and physical fitness requirements. Network with current oil field workers to understand the industry culture and expectations. Prepare for the demanding physical work and irregular schedules.`,
        potentialOutcomes: `Within 2-4 months, you could land an entry-level position with high earning potential ($50,000-$80,000+ annually). You'll gain valuable technical skills and experience in a high-demand industry. However, be prepared for physically demanding work, long hours, and potential job instability due to oil price fluctuations.`,
        nextSteps: `1) Research oil field companies and job postings in your region 2) Complete required safety certifications (OSHA 10, H2S Awareness, First Aid) 3) Get physically fit for demanding work conditions 4) Network with current oil field workers on LinkedIn 5) Apply to entry-level positions and be prepared for interviews`,
        timeline: `Month 1: Research and certification phase. Month 2: Physical preparation and networking. Month 3-4: Active job applications and interviews. Month 4-6: Onboarding and initial training period.`,
        resources: `Oil field job boards (Rigzone, OilCareers), safety training centers, physical fitness programs, industry networking events, and mentorship from experienced oil field workers.`
      };
    } else if (choiceName.includes('accountant') || combinedText.includes('accountant') || combinedText.includes('accounting')) {
      return {
        actionPlan: `Research accounting degree programs or certification requirements in your area. Consider whether you want to pursue a CPA license or start with basic accounting courses. Look into community college programs, online courses, or university degrees. Network with current accountants to understand the profession and career paths.`,
        potentialOutcomes: `Within 6-12 months, you could complete basic accounting education and land an entry-level position ($35,000-$50,000 annually). With experience and additional certifications, you could advance to senior roles ($60,000-$100,000+). The profession offers stability, growth opportunities, and the ability to work in various industries.`,
        nextSteps: `1) Research accounting education programs and requirements 2) Choose between degree program or certification track 3) Enroll in courses and begin studying 4) Network with accountants and join professional associations 5) Look for internships or entry-level positions while studying`,
        timeline: `Month 1-3: Research and enrollment in education program. Month 4-9: Active studying and coursework. Month 10-12: Job search and interview preparation. Year 2: Entry-level position and continued learning.`,
        resources: `Accounting education programs, CPA exam prep materials, professional associations (AICPA, state CPA societies), accounting software training, and mentorship from experienced accountants.`
      };
    } else if (choiceName.includes('negotiate for better terms') || choiceName.includes('negotiate') || combinedText.includes('negotiate')) {
      return {
        actionPlan: `Prepare for salary negotiations by researching market rates for your role and experience level. Document your achievements, contributions, and any additional responsibilities you've taken on. Practice your negotiation pitch, focusing on the value you bring to the company. Schedule a meeting with your manager during a good performance period, and come prepared with specific examples of your impact.`,
        potentialOutcomes: `Within 1-3 months, you could see a 5-15% salary increase, better benefits, or improved work arrangements. This negotiation could also strengthen your relationship with management by demonstrating your professional awareness and value. You'll gain confidence in advocating for yourself and may open doors for future advancement opportunities.`,
        nextSteps: `1) Research salary data for your role on Glassdoor, PayScale, and LinkedIn 2) Document your key achievements and contributions over the past year 3) Practice your negotiation pitch with a friend or mentor 4) Schedule a meeting with your manager for next week 5) Prepare a specific ask with supporting evidence`,
        timeline: `Week 1: Research and preparation. Week 2: Schedule and conduct the negotiation meeting. Week 3-4: Follow up and implement any agreed changes. Month 2-3: Evaluate results and plan next steps.`,
        resources: `Salary research websites (Glassdoor, PayScale, LinkedIn Salary), negotiation books, career coaches, HR contacts, and mentors who have successfully negotiated raises.`
      };
    } else if (choiceName.includes('starting a family') || choiceName.includes('family') || combinedText.includes('family')) {
      return {
        actionPlan: `Begin by having open, honest conversations with your partner about your timeline, values, and expectations around parenting. Research parenting styles, childcare options, and financial planning for children. Consider your living situation - do you need more space? Start tracking your menstrual cycle if applicable, and schedule a preconception checkup with your doctor.`,
        potentialOutcomes: `Within 3-6 months, you'll have clarity on your family planning timeline and be better prepared for this major life change. You may experience stronger emotional intimacy with your partner through these deep conversations. Financially, you'll have a clearer picture of what you need to save and prepare for.`,
        nextSteps: `1) Schedule a "family planning" date night to discuss your vision 2) Research childcare costs in your area 3) Meet with a financial advisor about family planning 4) Consider your living situation and space needs 5) Start taking prenatal vitamins if trying to conceive`,
        timeline: `Month 1-2: Deep conversations and research phase. Month 3-4: Financial planning and living situation assessment. Month 5-6: Begin trying to conceive or finalize adoption plans. Month 6-12: Pregnancy or adoption process begins.`,
        resources: `Financial planning tools, parenting books and courses, preconception healthcare, childcare research, family therapy if needed, support groups for new parents, and potentially fertility specialists or adoption agencies.`
      };
    } else if (choiceName.includes('exploring career opportunities') || choiceName.includes('career opportunities') || combinedText.includes('career')) {
      return {
        actionPlan: `Update your resume and LinkedIn profile to reflect your new marital status and any related skills. Research companies known for family-friendly policies and work-life balance. Network with other married professionals in your field. Consider if you want to stay in your current role or explore new opportunities that better align with your family goals.`,
        potentialOutcomes: `You'll likely find career opportunities that better support your family life within 4-8 months. This could mean higher pay, better benefits, more flexible hours, or remote work options. You may also discover new career paths you hadn't considered before marriage.`,
        nextSteps: `1) Update your professional profiles and resume 2) Research family-friendly companies in your field 3) Network with married professionals 4) Consider additional training or certifications 5) Start applying to new positions that align with your goals`,
        timeline: `Month 1-2: Profile updates and research. Month 3-4: Active networking and applications. Month 5-6: Interview process and negotiations. Month 6-8: Transition to new role or advancement in current position.`,
        resources: `Professional networking platforms, career coaches, industry associations, job search websites, skill development courses, and potentially recruiters who specialize in your field.`
      };
    } else if (choiceName.includes('managing joint finances') || choiceName.includes('joint finances') || combinedText.includes('finances')) {
      return {
        actionPlan: `Schedule a comprehensive financial planning session with your partner. Review both of your credit scores, debts, assets, and financial goals. Create a joint budget that accounts for shared expenses, individual spending, and future goals like buying a home or having children. Consider consulting a financial advisor who specializes in couples' financial planning.`,
        potentialOutcomes: `Within 2-4 months, you'll have a clear financial roadmap that both partners understand and agree on. This will reduce money-related stress and arguments. You'll likely see improved credit scores and better financial habits. You may also discover new ways to save money and invest for your future together.`,
        nextSteps: `1) Schedule a "money date" to review all finances together 2) Create a joint budget and spending plan 3) Set up joint accounts for shared expenses 4) Review and update beneficiaries on all accounts 5) Consider meeting with a financial advisor`,
        timeline: `Week 1-2: Initial financial review and discussion. Week 3-4: Budget creation and account setup. Month 2-3: Implementation and habit building. Month 3-4: Review and optimization of your financial plan.`,
        resources: `Financial planning apps, budgeting tools, financial advisors, credit counseling services, investment platforms, and educational resources about couples' financial management.`
      };
    } else if (choiceName.includes('investing in personal growth') || choiceName.includes('personal growth') || combinedText.includes('personal growth')) {
      return {
        actionPlan: `Identify areas where you'd like to grow both individually and as a couple. Consider couples therapy, relationship workshops, or individual counseling. Explore new hobbies or activities you can do together. Set personal development goals that align with your relationship values. Consider reading relationship books or taking online courses together.`,
        potentialOutcomes: `Within 3-6 months, you'll likely see improved communication, deeper emotional connection, and better conflict resolution skills. You may discover new shared interests and ways to support each other's individual growth. This investment in your relationship will pay dividends in long-term satisfaction and intimacy.`,
        nextSteps: `1) Discuss your individual and couple growth goals 2) Research couples therapy or relationship workshops 3) Choose a relationship book to read together 4) Plan regular "growth check-ins" 5) Consider individual therapy if needed`,
        timeline: `Month 1: Goal setting and research. Month 2-3: Begin therapy or workshops. Month 3-4: Implement new communication tools. Month 4-6: See measurable improvements in relationship dynamics.`,
        resources: `Couples therapists, relationship coaches, relationship books and podcasts, online courses, support groups, and potentially individual therapists for personal growth work.`
      };
    } else if (choiceName.includes('seek internal growth') || choiceName.includes('internal growth') || combinedText.includes('internal growth')) {
      return {
        actionPlan: `Identify specific growth opportunities within your current organization. Research internal job postings, talk to your manager about advancement possibilities, and express interest in taking on new projects or responsibilities. Look for mentorship opportunities with senior colleagues and consider cross-functional projects that could expand your skills.`,
        potentialOutcomes: `Within 3-6 months, you could see new project assignments, skill development opportunities, or even a promotion. This approach allows you to grow while maintaining job security and building stronger relationships within your current company. You'll also gain visibility with leadership and expand your professional network internally.`,
        nextSteps: `1) Schedule a career development meeting with your manager 2) Research internal job postings and requirements 3) Identify 2-3 senior colleagues to approach for mentorship 4) Volunteer for cross-functional projects or committees 5) Update your internal profile and express interest in growth opportunities`,
        timeline: `Week 1-2: Initial conversations and research. Month 1-2: Building relationships and taking on new projects. Month 3-4: Demonstrating value and seeking feedback. Month 5-6: Evaluating progress and planning next steps.`,
        resources: `Internal job boards, HR contacts, senior colleagues, professional development courses, mentorship programs, and company training resources.`
      };
    } else if (choiceName.includes('explore external opportunities') || choiceName.includes('external opportunities') || combinedText.includes('external opportunities')) {
      return {
        actionPlan: `Research companies that align with your values and career goals. Update your resume and LinkedIn profile to highlight relevant skills and achievements. Network with professionals in your field through industry events, online communities, and professional associations. Start applying to positions that offer better growth potential, culture fit, or compensation.`,
        potentialOutcomes: `Within 2-6 months, you could land interviews with companies that offer better opportunities for advancement, higher compensation, or a more supportive culture. This exploration could also help you clarify your career priorities and identify what you truly want in your next role.`,
        nextSteps: `1) Research 10-15 target companies in your field 2) Update your resume and LinkedIn profile 3) Attend 2-3 networking events this month 4) Apply to 3-5 positions that interest you 5) Reach out to 5-10 professionals for informational interviews`,
        timeline: `Month 1: Research and profile updates. Month 2-3: Active networking and applications. Month 3-4: Interview process and evaluations. Month 4-6: Decision making and potential transitions.`,
        resources: `Job search websites, professional networking platforms, industry associations, career coaches, recruiters, and professional development resources.`
      };
    } else if (choiceName.includes('develop new skills') || choiceName.includes('new skills') || combinedText.includes('skills')) {
      return {
        actionPlan: `Identify the most valuable skills for your career advancement by researching job postings in your field and talking to successful professionals. Choose 1-2 skills to focus on initially and find high-quality learning resources. Set aside dedicated time each week for skill development and practice. Look for opportunities to apply these skills in your current role or through side projects.`,
        potentialOutcomes: `Within 3-6 months, you'll have gained new competencies that make you more valuable to employers and open up new career opportunities. These skills could lead to better job performance, increased confidence, and potentially higher compensation or advancement opportunities.`,
        nextSteps: `1) Research in-demand skills for your field 2) Choose 1-2 skills to focus on first 3) Find high-quality online courses or training programs 4) Schedule 2-3 hours per week for skill development 5) Look for projects at work to practice these skills`,
        timeline: `Month 1: Skill selection and learning plan. Month 2-3: Active learning and practice. Month 4-5: Application in real projects. Month 6: Evaluation and planning next skills.`,
        resources: `Online learning platforms (Coursera, Udemy, LinkedIn Learning), professional certifications, industry workshops, mentors, practice projects, and professional communities.`
      };
    }
    
    // Default fallback for other options - try to be more contextual
    const isCareerRelated = combinedText.includes('career') || combinedText.includes('job') || combinedText.includes('work') || 
                           combinedText.includes('profession') || combinedText.includes('industry') || combinedText.includes('field');
    
    if (isCareerRelated) {
      return {
        actionPlan: `Research the "${choice.name}" field thoroughly to understand requirements, qualifications, and career paths. Identify the specific skills, certifications, or education needed. Network with professionals in this field to gain insights and potential opportunities. Create a step-by-step plan to transition into this career.`,
        potentialOutcomes: `Within 6-12 months, you could gain the necessary qualifications and land an entry-level position in the "${choice.name}" field. This career change could lead to better job satisfaction, higher earning potential, or improved work-life balance. You'll develop new skills and expand your professional network.`,
        nextSteps: `1) Research job requirements and qualifications for "${choice.name}" 2) Identify necessary education, training, or certifications 3) Network with professionals in this field 4) Create a timeline for skill development 5) Start applying to relevant positions or training programs`,
        timeline: `Month 1-3: Research and skill assessment phase. Month 4-6: Education, training, or certification period. Month 7-9: Job search and networking. Month 10-12: Interview process and career transition.`,
        resources: `Industry associations, professional networking platforms, job boards, educational programs, mentors in the field, and relevant training or certification programs.`
      };
    }
    
    return {
      actionPlan: `Create a detailed plan for "${choice.name}" by breaking it down into specific, actionable steps. Research best practices, gather necessary resources, and set clear milestones for progress. Consider how this aligns with your overall life goals and priorities.`,
      potentialOutcomes: `By pursuing "${choice.name}", you'll likely see positive changes in your life within 3-6 months. This could include improved relationships, better life satisfaction, or progress toward your long-term goals. The specific outcomes will depend on your commitment and the nature of this choice.`,
      nextSteps: `1) Research and gather information about this path 2) Set specific, measurable goals 3) Create a timeline for implementation 4) Identify potential obstacles and solutions 5) Take the first concrete step within the next week`,
      timeline: `Month 1-2: Planning and preparation phase. Month 3-4: Active implementation and habit building. Month 5-6: Evaluation and adjustment of your approach. Month 6-12: Continued progress and refinement.`,
      resources: `Educational materials, mentors or advisors, support groups, relevant tools and technology, and potentially professional services related to your chosen path.`
    };
  };

  const generateFollowUpSummary = (simulation: any, followUp: any) => {
    return `
      <div class="space-y-4">
        <h4 class="font-semibold text-lg">Your Action Plan: "${followUp.name}"</h4>
        
        <div class="bg-blue-50 p-4 rounded-lg">
          <h5 class="font-medium text-blue-900 mb-2">Action Plan</h5>
          <p class="text-blue-800 text-sm">${simulation.actionPlan}</p>
        </div>
        
        <div class="bg-green-50 p-4 rounded-lg">
          <h5 class="font-medium text-green-900 mb-2">Potential Outcomes</h5>
          <p class="text-green-800 text-sm">${simulation.potentialOutcomes}</p>
        </div>
        
        <div class="bg-purple-50 p-4 rounded-lg">
          <h5 class="font-medium text-purple-900 mb-2">Next Steps</h5>
          <p class="text-purple-800 text-sm">${simulation.nextSteps}</p>
        </div>
        
        <div class="bg-orange-50 p-4 rounded-lg">
          <h5 class="font-medium text-orange-900 mb-2">Timeline</h5>
          <p class="text-orange-800 text-sm">${simulation.timeline}</p>
        </div>
        
        <div class="bg-indigo-50 p-4 rounded-lg">
          <h5 class="font-medium text-indigo-900 mb-2">Resources Needed</h5>
          <p class="text-indigo-800 text-sm">${simulation.resources}</p>
        </div>
      </div>
    `;
  };



  const getStepIcon = (step: DecisionStep) => {
    switch (step.type) {
      case 'question':
        return <MessageCircle className="w-5 h-5" />;
      case 'choice':
        return <CheckCircle className="w-5 h-5" />;
      case 'simulation':
        return <Zap className="w-5 h-5" />;
      case 'result':
        return <Brain className="w-5 h-5" />;
      case 'storyline':
        return <BookOpen className="w-5 h-5" />;
      case 'followup':
        return <ArrowRight className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStepColor = (step: DecisionStep) => {
    switch (step.type) {
      case 'question':
        return 'bg-blue-500';
      case 'choice':
        return 'bg-green-500';
      case 'simulation':
        return 'bg-purple-500';
      case 'result':
        return 'bg-orange-500';
      case 'storyline':
        return 'bg-indigo-500';
      case 'followup':
        return 'bg-pink-500';
      default:
        return 'bg-gray-500';
    }
  };

  const currentStepData = steps[currentStep];
  console.log('Current step data:', { 
    currentStep, 
    totalSteps: steps.length,
    stepType: currentStepData?.type,
    stepTitle: currentStepData?.title,
    hasFollowUpDecisions: !!currentStepData?.followUpDecisions,
    followUpCount: currentStepData?.followUpDecisions?.length || 0
  });
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center space-x-4 mb-8">
        <div className="flex space-x-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${
                index <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>

      {/* Current Step */}
      {currentStepData && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Step Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className={`p-2 rounded-lg ${getStepColor(currentStepData)} text-white`}>
              {getStepIcon(currentStepData)}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {currentStepData.title}
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(currentStepData.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-6">
            {currentStepData.type === 'result' ? (
              <div 
                dangerouslySetInnerHTML={{ __html: currentStepData.content }}
                className="prose prose-sm max-w-none"
              />
            ) : currentStepData.type === 'storyline' ? (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border-l-4 border-indigo-400">
                <p className="text-gray-700 leading-relaxed text-lg">
                  {currentStepData.content}
                </p>
              </div>
            ) : currentStepData.type === 'followup' ? (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed mb-4">
                  {currentStepData.content}
                </p>
                <div className="grid gap-3">
                  {currentStepData.followUpDecisions?.map((followUp, index) => (
                    <button
                      key={index}
                      onClick={() => handleFollowUpSelect(followUp)}
                      disabled={isProcessing}
                      className="text-left bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4 border border-pink-200 hover:border-pink-300 hover:bg-gradient-to-r hover:from-pink-100 hover:to-rose-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {followUp.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {followUp.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-700 leading-relaxed">
                {currentStepData.content}
              </p>
            )}
          </div>

          {/* Choices */}
          {currentStepData.type === 'question' && currentStep === 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 mb-4">Choose your path:</h4>
              <div className="grid gap-3">
                {(currentStepData.choices || branches).map((choice, index) => {
                  const isBranch = choice.branchId;
                  const choiceData = isBranch ? choice : {
                    id: choice.id,
                    text: choice.text,
                    description: choice.description,
                    branchId: choice.id
                  };
                  
                  return (
                    <button
                      key={choiceData.id}
                      onClick={() => handleChoiceSelect(choiceData)}
                      disabled={isProcessing}
                      className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">{choiceData.text}</h5>
                          <p className="text-sm text-gray-600 mt-1">{choiceData.description}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Processing your choice...</span>
            </div>
          )}


          {/* Navigation */}
          {!isProcessing && (
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              
              <div className="flex space-x-2">
                {!isLastStep && (
                  <button
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Next →
                  </button>
                )}
                
                {isLastStep && (
                  <button
                    onClick={() => {
                      setSteps([]);
                      setCurrentStep(0);
                      initializeFlow();
                    }}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Start Over
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step History */}
      {steps.length > 1 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Decision Journey</h4>
          <div className="space-y-3">
            {steps.slice(0, -1).map((step, index) => (
              <div key={step.id} className="flex items-center space-x-3 text-sm">
                <div className={`w-2 h-2 rounded-full ${getStepColor(step)}`} />
                <span className="text-gray-600">{step.title}</span>
                <span className="text-gray-400">
                  {new Date(step.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
