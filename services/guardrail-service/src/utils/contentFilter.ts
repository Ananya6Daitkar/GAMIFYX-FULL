import * as natural from 'natural';
import * as sentiment from 'sentiment';
import Filter from 'bad-words';
import { 
  ContentFilterRequest, 
  ContentFilterResponse, 
  FilterType 
} from '@/types';
import { createHash } from 'crypto';

export class ContentFilter {
  private profanityFilter: Filter;
  private sentimentAnalyzer: any;
  private hateSpeechPatterns: string[];
  private violencePatterns: string[];
  private adultContentPatterns: string[];
  private misinformationPatterns: string[];
  private spamPatterns: string[];

  constructor() {
    this.profanityFilter = new Filter();
    this.sentimentAnalyzer = new sentiment();
    this.initializeFilterPatterns();
  }

  private initializeFilterPatterns() {
    // Hate speech patterns
    this.hateSpeechPatterns = [
      'hate', 'racist', 'bigot', 'supremacist', 'nazi', 'fascist',
      'terrorist', 'extremist', 'radical', 'fanatic', 'kill all',
      'death to', 'eliminate', 'exterminate', 'inferior', 'subhuman'
    ];

    // Violence patterns
    this.violencePatterns = [
      'kill', 'murder', 'assassinate', 'execute', 'slaughter', 'massacre',
      'torture', 'abuse', 'assault', 'attack', 'violence', 'weapon',
      'bomb', 'explosive', 'gun', 'knife', 'hurt', 'harm', 'destroy',
      'suicide', 'self-harm', 'cut yourself', 'end it all'
    ];

    // Adult content patterns
    this.adultContentPatterns = [
      'explicit', 'nsfw', 'adult only', 'mature content', 'sexual',
      'pornographic', 'erotic', 'nude', 'naked', 'xxx'
    ];

    // Misinformation patterns
    this.misinformationPatterns = [
      'fake news', 'conspiracy', 'hoax', 'false flag', 'cover-up',
      'they dont want you to know', 'hidden truth', 'secret agenda',
      'wake up sheeple', 'do your own research', 'mainstream media lies'
    ];

    // Spam patterns
    this.spamPatterns = [
      'click here', 'buy now', 'limited time', 'act fast', 'urgent',
      'congratulations you won', 'free money', 'get rich quick',
      'work from home', 'make money fast', 'no experience required'
    ];
  }

  async filterContent(request: ContentFilterRequest): Promise<ContentFilterResponse> {
    const contentHash = this.generateContentHash(request.content);
    const tokens = natural.WordTokenizer.tokenize(request.content.toLowerCase());
    
    const filterResults = [];
    let overallSeverity = 0;
    let isBlocked = false;
    let modifiedContent = request.content;

    // Apply different filters based on request
    const filterTypes = request.filterTypes || ['Profanity', 'Hate Speech', 'Violence', 'Adult Content', 'Misinformation', 'Spam'];

    for (const filterType of filterTypes) {
      const result = await this.applyFilter(filterType as FilterType, request.content, tokens);
      if (result.severity > 0) {
        filterResults.push(result);
        overallSeverity = Math.max(overallSeverity, result.severity);
        
        if (result.severity >= 0.8 || (request.strictMode && result.severity >= 0.6)) {
          isBlocked = true;
        }
        
        if (result.modifiedContent && result.modifiedContent !== request.content) {
          modifiedContent = result.modifiedContent;
        }
      }
    }

    // Perform sentiment analysis
    const sentimentAnalysis = this.analyzeSentiment(request.content);
    
    // Perform toxicity analysis
    const toxicityAnalysis = this.analyzeToxicity(request.content, tokens);

    // Generate recommendations
    const recommendations = this.generateRecommendations(filterResults, overallSeverity, sentimentAnalysis);

    return {
      contentHash,
      isBlocked,
      overallSeverity,
      filterResults,
      sentimentAnalysis,
      toxicityAnalysis,
      modifiedContent: modifiedContent !== request.content ? modifiedContent : undefined,
      recommendations
    };
  }

  private async applyFilter(filterType: FilterType, content: string, tokens: string[]): Promise<any> {
    switch (filterType) {
      case 'Profanity':
        return this.filterProfanity(content, tokens);
      case 'Hate Speech':
        return this.filterHateSpeech(content, tokens);
      case 'Violence':
        return this.filterViolence(content, tokens);
      case 'Adult Content':
        return this.filterAdultContent(content, tokens);
      case 'Misinformation':
        return this.filterMisinformation(content, tokens);
      case 'Spam':
        return this.filterSpam(content, tokens);
      default:
        return { filterType, severity: 0, confidence: 0, detectedPatterns: [], explanation: '' };
    }
  }

  private filterProfanity(content: string, tokens: string[]): any {
    const detectedPatterns: string[] = [];
    let severity = 0;

    // Use bad-words library to detect profanity
    const hasProfanity = this.profanityFilter.isProfane(content);
    
    if (hasProfanity) {
      // Get profane words
      const profaneWords = tokens.filter(token => this.profanityFilter.isProfane(token));
      detectedPatterns.push(...profaneWords);
      severity = Math.min(profaneWords.length * 0.3, 1.0);
    }

    // Clean the content
    const modifiedContent = this.profanityFilter.clean(content);

    return {
      filterType: 'Profanity',
      severity,
      confidence: hasProfanity ? 0.9 : 0,
      detectedPatterns: [...new Set(detectedPatterns)],
      explanation: hasProfanity ? `${detectedPatterns.length} profane word(s) detected` : 'No profanity detected',
      modifiedContent: modifiedContent !== content ? modifiedContent : undefined
    };
  }

  private filterHateSpeech(content: string, tokens: string[]): any {
    const detectedPatterns: string[] = [];
    let severity = 0;

    // Check for hate speech patterns
    const hatefulTerms = tokens.filter(token => 
      this.hateSpeechPatterns.some(pattern => token.includes(pattern) || pattern.includes(token))
    );

    if (hatefulTerms.length > 0) {
      detectedPatterns.push(...hatefulTerms);
      severity = Math.min(hatefulTerms.length * 0.4, 1.0);
    }

    // Check for hate speech phrases
    const lowerContent = content.toLowerCase();
    this.hateSpeechPatterns.forEach(pattern => {
      if (lowerContent.includes(pattern)) {
        detectedPatterns.push(pattern);
        severity = Math.max(severity, 0.8);
      }
    });

    // Additional context analysis for hate speech
    const contextualHate = this.analyzeContextualHate(content);
    if (contextualHate.length > 0) {
      detectedPatterns.push(...contextualHate);
      severity = Math.max(severity, 0.7);
    }

    return {
      filterType: 'Hate Speech',
      severity,
      confidence: detectedPatterns.length > 0 ? 0.85 : 0,
      detectedPatterns: [...new Set(detectedPatterns)],
      explanation: detectedPatterns.length > 0 ? 
        `${detectedPatterns.length} hate speech indicator(s) detected` : 
        'No hate speech detected'
    };
  }

  private filterViolence(content: string, tokens: string[]): any {
    const detectedPatterns: string[] = [];
    let severity = 0;

    // Check for violent terms
    const violentTerms = tokens.filter(token => 
      this.violencePatterns.some(pattern => token.includes(pattern) || pattern.includes(token))
    );

    if (violentTerms.length > 0) {
      detectedPatterns.push(...violentTerms);
      severity = Math.min(violentTerms.length * 0.3, 0.8);
    }

    // Check for violent phrases
    const lowerContent = content.toLowerCase();
    this.violencePatterns.forEach(pattern => {
      if (lowerContent.includes(pattern)) {
        detectedPatterns.push(pattern);
        severity = Math.max(severity, 0.6);
      }
    });

    // Check for self-harm indicators
    const selfHarmIndicators = this.analyzeSelfHarm(content);
    if (selfHarmIndicators.length > 0) {
      detectedPatterns.push(...selfHarmIndicators);
      severity = Math.max(severity, 0.9); // High severity for self-harm
    }

    return {
      filterType: 'Violence',
      severity,
      confidence: detectedPatterns.length > 0 ? 0.8 : 0,
      detectedPatterns: [...new Set(detectedPatterns)],
      explanation: detectedPatterns.length > 0 ? 
        `${detectedPatterns.length} violence indicator(s) detected` : 
        'No violent content detected'
    };
  }

  private filterAdultContent(content: string, tokens: string[]): any {
    const detectedPatterns: string[] = [];
    let severity = 0;

    // Check for adult content terms
    const adultTerms = tokens.filter(token => 
      this.adultContentPatterns.some(pattern => token.includes(pattern) || pattern.includes(token))
    );

    if (adultTerms.length > 0) {
      detectedPatterns.push(...adultTerms);
      severity = Math.min(adultTerms.length * 0.4, 1.0);
    }

    // Check for adult content phrases
    const lowerContent = content.toLowerCase();
    this.adultContentPatterns.forEach(pattern => {
      if (lowerContent.includes(pattern)) {
        detectedPatterns.push(pattern);
        severity = Math.max(severity, 0.7);
      }
    });

    return {
      filterType: 'Adult Content',
      severity,
      confidence: detectedPatterns.length > 0 ? 0.75 : 0,
      detectedPatterns: [...new Set(detectedPatterns)],
      explanation: detectedPatterns.length > 0 ? 
        `${detectedPatterns.length} adult content indicator(s) detected` : 
        'No adult content detected'
    };
  }

  private filterMisinformation(content: string, tokens: string[]): any {
    const detectedPatterns: string[] = [];
    let severity = 0;

    // Check for misinformation patterns
    const lowerContent = content.toLowerCase();
    this.misinformationPatterns.forEach(pattern => {
      if (lowerContent.includes(pattern)) {
        detectedPatterns.push(pattern);
        severity = Math.max(severity, 0.6);
      }
    });

    // Check for conspiracy theory indicators
    const conspiracyIndicators = this.analyzeConspiracyTheories(content);
    if (conspiracyIndicators.length > 0) {
      detectedPatterns.push(...conspiracyIndicators);
      severity = Math.max(severity, 0.7);
    }

    return {
      filterType: 'Misinformation',
      severity,
      confidence: detectedPatterns.length > 0 ? 0.7 : 0,
      detectedPatterns: [...new Set(detectedPatterns)],
      explanation: detectedPatterns.length > 0 ? 
        `${detectedPatterns.length} misinformation indicator(s) detected` : 
        'No misinformation detected'
    };
  }

  private filterSpam(content: string, tokens: string[]): any {
    const detectedPatterns: string[] = [];
    let severity = 0;

    // Check for spam patterns
    const lowerContent = content.toLowerCase();
    this.spamPatterns.forEach(pattern => {
      if (lowerContent.includes(pattern)) {
        detectedPatterns.push(pattern);
        severity = Math.max(severity, 0.5);
      }
    });

    // Check for excessive capitalization
    const capsRatio = this.calculateCapsRatio(content);
    if (capsRatio > 0.5) {
      detectedPatterns.push('excessive capitalization');
      severity = Math.max(severity, 0.4);
    }

    // Check for excessive punctuation
    const punctuationRatio = this.calculatePunctuationRatio(content);
    if (punctuationRatio > 0.2) {
      detectedPatterns.push('excessive punctuation');
      severity = Math.max(severity, 0.3);
    }

    return {
      filterType: 'Spam',
      severity,
      confidence: detectedPatterns.length > 0 ? 0.6 : 0,
      detectedPatterns: [...new Set(detectedPatterns)],
      explanation: detectedPatterns.length > 0 ? 
        `${detectedPatterns.length} spam indicator(s) detected` : 
        'No spam detected'
    };
  }  p
rivate analyzeSentiment(content: string): any {
    const result = this.sentimentAnalyzer.analyze(content);
    
    let label: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (result.score > 0) {
      label = 'positive';
    } else if (result.score < 0) {
      label = 'negative';
    }

    return {
      score: result.comparative, // Normalized score
      label
    };
  }

  private analyzeToxicity(content: string, tokens: string[]): any {
    let toxicityScore = 0;
    const categories: string[] = [];

    // Simple toxicity analysis based on patterns
    const toxicPatterns = [
      ...this.hateSpeechPatterns,
      ...this.violencePatterns.slice(0, 10), // First 10 violence patterns
      'toxic', 'poison', 'venom', 'malicious', 'nasty', 'vile'
    ];

    const toxicTerms = tokens.filter(token => 
      toxicPatterns.some(pattern => token.includes(pattern) || pattern.includes(token))
    );

    if (toxicTerms.length > 0) {
      toxicityScore = Math.min(toxicTerms.length * 0.2, 1.0);
      
      // Categorize toxicity
      if (toxicTerms.some(term => this.hateSpeechPatterns.includes(term))) {
        categories.push('hate');
      }
      if (toxicTerms.some(term => this.violencePatterns.includes(term))) {
        categories.push('violence');
      }
      if (toxicTerms.some(term => ['toxic', 'poison', 'venom'].includes(term))) {
        categories.push('general_toxicity');
      }
    }

    return {
      score: toxicityScore,
      categories: [...new Set(categories)]
    };
  }

  private analyzeContextualHate(content: string): string[] {
    const patterns: string[] = [];
    const lowerContent = content.toLowerCase();

    // Contextual hate speech patterns
    const contextualPatterns = [
      'you people', 'those people', 'not like us', 'go back to',
      'dont belong here', 'not welcome', 'inferior race', 'master race'
    ];

    contextualPatterns.forEach(pattern => {
      if (lowerContent.includes(pattern)) {
        patterns.push(pattern);
      }
    });

    return patterns;
  }

  private analyzeSelfHarm(content: string): string[] {
    const patterns: string[] = [];
    const lowerContent = content.toLowerCase();

    // Self-harm indicators
    const selfHarmPatterns = [
      'kill myself', 'end my life', 'want to die', 'suicide',
      'cut myself', 'hurt myself', 'self harm', 'not worth living',
      'better off dead', 'end it all'
    ];

    selfHarmPatterns.forEach(pattern => {
      if (lowerContent.includes(pattern)) {
        patterns.push(pattern);
      }
    });

    return patterns;
  }

  private analyzeConspiracyTheories(content: string): string[] {
    const patterns: string[] = [];
    const lowerContent = content.toLowerCase();

    // Conspiracy theory indicators
    const conspiracyPatterns = [
      'illuminati', 'new world order', 'deep state', 'shadow government',
      'false flag operation', 'crisis actors', 'staged event',
      'government coverup', 'they control everything'
    ];

    conspiracyPatterns.forEach(pattern => {
      if (lowerContent.includes(pattern)) {
        patterns.push(pattern);
      }
    });

    return patterns;
  }

  private calculateCapsRatio(content: string): number {
    const totalChars = content.replace(/\s/g, '').length;
    if (totalChars === 0) return 0;
    
    const capsChars = content.replace(/[^A-Z]/g, '').length;
    return capsChars / totalChars;
  }

  private calculatePunctuationRatio(content: string): number {
    const totalChars = content.length;
    if (totalChars === 0) return 0;
    
    const punctuationChars = content.replace(/[^!@#$%^&*(),.?":{}|<>]/g, '').length;
    return punctuationChars / totalChars;
  }

  private generateRecommendations(filterResults: any[], overallSeverity: number, sentimentAnalysis: any): string[] {
    const recommendations: string[] = [];

    if (overallSeverity > 0.8) {
      recommendations.push('Content blocked due to high severity violations - requires manual review');
    } else if (overallSeverity > 0.6) {
      recommendations.push('Content flagged for review - consider revision before publication');
    } else if (overallSeverity > 0.3) {
      recommendations.push('Minor content issues detected - review recommended');
    }

    filterResults.forEach(result => {
      switch (result.filterType) {
        case 'Profanity':
          if (result.severity > 0.5) {
            recommendations.push('Replace profane language with appropriate alternatives');
          }
          break;
        case 'Hate Speech':
          if (result.severity > 0.3) {
            recommendations.push('Remove hate speech content and use inclusive language');
          }
          break;
        case 'Violence':
          if (result.severity > 0.7) {
            recommendations.push('Remove violent content - consider crisis intervention if self-harm detected');
          }
          break;
        case 'Adult Content':
          if (result.severity > 0.5) {
            recommendations.push('Add content warnings or move to age-restricted platform');
          }
          break;
        case 'Misinformation':
          if (result.severity > 0.4) {
            recommendations.push('Verify claims with reliable sources before publication');
          }
          break;
        case 'Spam':
          if (result.severity > 0.4) {
            recommendations.push('Reduce promotional language and excessive formatting');
          }
          break;
      }
    });

    if (sentimentAnalysis.score < -0.5) {
      recommendations.push('Content has very negative sentiment - consider more balanced tone');
    }

    if (recommendations.length === 0) {
      recommendations.push('Content passed all filters - safe for publication');
    }

    return [...new Set(recommendations)];
  }

  private generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  // Public methods for customization
  public addCustomProfanityWords(words: string[]): void {
    this.profanityFilter.addWords(...words);
  }

  public removeCustomProfanityWords(words: string[]): void {
    this.profanityFilter.removeWords(...words);
  }

  public addCustomHateSpeechPatterns(patterns: string[]): void {
    this.hateSpeechPatterns.push(...patterns);
  }

  public addCustomViolencePatterns(patterns: string[]): void {
    this.violencePatterns.push(...patterns);
  }

  public getFilterStats(): any {
    return {
      profanityWordsCount: this.profanityFilter.list.length,
      hateSpeechPatternsCount: this.hateSpeechPatterns.length,
      violencePatternsCount: this.violencePatterns.length,
      adultContentPatternsCount: this.adultContentPatterns.length,
      misinformationPatternsCount: this.misinformationPatterns.length,
      spamPatternsCount: this.spamPatterns.length
    };
  }

  // Method to test filter effectiveness
  public testFilter(testContent: string[]): any {
    const results = {
      totalTests: testContent.length,
      detectedCount: 0,
      averageSeverity: 0,
      filterBreakdown: {} as any
    };

    let totalSeverity = 0;

    testContent.forEach(async content => {
      const filterResult = await this.filterContent({ content });
      if (filterResult.overallSeverity > 0) {
        results.detectedCount++;
        totalSeverity += filterResult.overallSeverity;
        
        filterResult.filterResults.forEach(result => {
          if (!results.filterBreakdown[result.filterType]) {
            results.filterBreakdown[result.filterType] = 0;
          }
          results.filterBreakdown[result.filterType]++;
        });
      }
    });

    results.averageSeverity = results.detectedCount > 0 ? totalSeverity / results.detectedCount : 0;

    return results;
  }
}