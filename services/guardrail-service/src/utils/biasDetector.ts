import * as natural from 'natural';
import { 
  BiasAnalysisRequest, 
  BiasAnalysisResponse, 
  DemographicParityMetric, 
  EqualizedOddsMetric,
  BiasType 
} from '@/types';
import { createHash } from 'crypto';

export class BiasDetector {
  private genderTerms: { [key: string]: string[] };
  private raceTerms: { [key: string]: string[] };
  private ageTerms: { [key: string]: string[] };
  private religionTerms: { [key: string]: string[] };
  private nationalityTerms: { [key: string]: string[] };

  constructor() {
    this.initializeBiasTerms();
  }

  private initializeBiasTerms() {
    // Gender bias terms
    this.genderTerms = {
      male: ['man', 'men', 'male', 'boy', 'boys', 'gentleman', 'guy', 'guys', 'he', 'him', 'his'],
      female: ['woman', 'women', 'female', 'girl', 'girls', 'lady', 'ladies', 'she', 'her', 'hers'],
      stereotypes: ['emotional', 'nurturing', 'aggressive', 'strong', 'weak', 'bossy', 'assertive']
    };

    // Racial bias terms
    this.raceTerms = {
      descriptors: ['black', 'white', 'asian', 'hispanic', 'latino', 'african', 'european', 'american'],
      stereotypes: ['articulate', 'well-spoken', 'exotic', 'urban', 'ghetto', 'privileged']
    };

    // Age bias terms
    this.ageTerms = {
      young: ['young', 'millennial', 'gen-z', 'teenager', 'youth', 'junior'],
      old: ['old', 'elderly', 'senior', 'boomer', 'mature', 'experienced', 'veteran'],
      stereotypes: ['tech-savvy', 'outdated', 'energetic', 'slow', 'wise', 'inexperienced']
    };

    // Religious bias terms
    this.religionTerms = {
      religions: ['christian', 'muslim', 'jewish', 'hindu', 'buddhist', 'atheist', 'catholic', 'protestant'],
      stereotypes: ['devout', 'radical', 'conservative', 'traditional', 'fundamentalist']
    };

    // Nationality bias terms
    this.nationalityTerms = {
      countries: ['american', 'chinese', 'indian', 'mexican', 'canadian', 'british', 'german', 'french'],
      stereotypes: ['foreign', 'immigrant', 'native', 'exotic', 'outsider']
    };
  }

  async analyzeBias(request: BiasAnalysisRequest): Promise<BiasAnalysisResponse> {
    const contentHash = this.generateContentHash(request.content);
    const tokens = natural.WordTokenizer.tokenize(request.content.toLowerCase());
    
    const biasDetections = [];
    let overallBiasScore = 0;

    // Analyze different types of bias
    const genderBias = this.detectGenderBias(tokens, request.content);
    if (genderBias.score > 0) {
      biasDetections.push(genderBias);
      overallBiasScore = Math.max(overallBiasScore, genderBias.score);
    }

    const racialBias = this.detectRacialBias(tokens, request.content);
    if (racialBias.score > 0) {
      biasDetections.push(racialBias);
      overallBiasScore = Math.max(overallBiasScore, racialBias.score);
    }

    const ageBias = this.detectAgeBias(tokens, request.content);
    if (ageBias.score > 0) {
      biasDetections.push(ageBias);
      overallBiasScore = Math.max(overallBiasScore, ageBias.score);
    }

    const religionBias = this.detectReligionBias(tokens, request.content);
    if (religionBias.score > 0) {
      biasDetections.push(religionBias);
      overallBiasScore = Math.max(overallBiasScore, religionBias.score);
    }

    const nationalityBias = this.detectNationalityBias(tokens, request.content);
    if (nationalityBias.score > 0) {
      biasDetections.push(nationalityBias);
      overallBiasScore = Math.max(overallBiasScore, nationalityBias.score);
    }

    // Calculate fairness metrics if requested
    const fairnessMetrics = this.calculateFairnessMetrics(
      request.content, 
      request.analysisType || 'both'
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(biasDetections, overallBiasScore);

    return {
      contentHash,
      overallBiasScore,
      biasDetections,
      fairnessMetrics,
      recommendations,
      actionRequired: overallBiasScore > 0.7
    };
  }

  private detectGenderBias(tokens: string[], content: string): any {
    const detectedTerms: string[] = [];
    let biasScore = 0;
    let stereotypeCount = 0;

    // Check for gender-specific terms
    const maleTerms = tokens.filter(token => this.genderTerms.male.includes(token));
    const femaleTerms = tokens.filter(token => this.genderTerms.female.includes(token));
    const stereotypeTerms = tokens.filter(token => this.genderTerms.stereotypes.includes(token));

    // Calculate imbalance
    const totalGenderTerms = maleTerms.length + femaleTerms.length;
    if (totalGenderTerms > 0) {
      const imbalance = Math.abs(maleTerms.length - femaleTerms.length) / totalGenderTerms;
      biasScore += imbalance * 0.5;
      detectedTerms.push(...maleTerms, ...femaleTerms);
    }

    // Check for stereotypes
    if (stereotypeTerms.length > 0) {
      stereotypeCount = stereotypeTerms.length;
      biasScore += Math.min(stereotypeCount * 0.2, 0.5);
      detectedTerms.push(...stereotypeTerms);
    }

    // Context analysis for gendered language patterns
    const genderedPatterns = this.analyzeGenderedPatterns(content);
    if (genderedPatterns.length > 0) {
      biasScore += 0.3;
      detectedTerms.push(...genderedPatterns);
    }

    return {
      biasType: 'Gender',
      score: Math.min(biasScore, 1.0),
      confidence: this.calculateConfidence(detectedTerms.length, tokens.length),
      detectedTerms: [...new Set(detectedTerms)],
      explanation: this.generateGenderBiasExplanation(maleTerms.length, femaleTerms.length, stereotypeCount)
    };
  }

  private detectRacialBias(tokens: string[], content: string): any {
    const detectedTerms: string[] = [];
    let biasScore = 0;

    // Check for racial descriptors
    const racialDescriptors = tokens.filter(token => 
      this.raceTerms.descriptors.includes(token)
    );

    // Check for racial stereotypes
    const stereotypeTerms = tokens.filter(token => 
      this.raceTerms.stereotypes.includes(token)
    );

    if (racialDescriptors.length > 0) {
      biasScore += Math.min(racialDescriptors.length * 0.3, 0.6);
      detectedTerms.push(...racialDescriptors);
    }

    if (stereotypeTerms.length > 0) {
      biasScore += Math.min(stereotypeTerms.length * 0.4, 0.8);
      detectedTerms.push(...stereotypeTerms);
    }

    // Check for problematic racial patterns
    const problematicPatterns = this.analyzeRacialPatterns(content);
    if (problematicPatterns.length > 0) {
      biasScore += 0.5;
      detectedTerms.push(...problematicPatterns);
    }

    return {
      biasType: 'Race',
      score: Math.min(biasScore, 1.0),
      confidence: this.calculateConfidence(detectedTerms.length, tokens.length),
      detectedTerms: [...new Set(detectedTerms)],
      explanation: this.generateRacialBiasExplanation(racialDescriptors.length, stereotypeTerms.length)
    };
  }

  private detectAgeBias(tokens: string[], content: string): any {
    const detectedTerms: string[] = [];
    let biasScore = 0;

    const youngTerms = tokens.filter(token => this.ageTerms.young.includes(token));
    const oldTerms = tokens.filter(token => this.ageTerms.old.includes(token));
    const stereotypeTerms = tokens.filter(token => this.ageTerms.stereotypes.includes(token));

    // Calculate age-related imbalance
    const totalAgeTerms = youngTerms.length + oldTerms.length;
    if (totalAgeTerms > 0) {
      const imbalance = Math.abs(youngTerms.length - oldTerms.length) / totalAgeTerms;
      biasScore += imbalance * 0.4;
      detectedTerms.push(...youngTerms, ...oldTerms);
    }

    if (stereotypeTerms.length > 0) {
      biasScore += Math.min(stereotypeTerms.length * 0.3, 0.6);
      detectedTerms.push(...stereotypeTerms);
    }

    return {
      biasType: 'Age',
      score: Math.min(biasScore, 1.0),
      confidence: this.calculateConfidence(detectedTerms.length, tokens.length),
      detectedTerms: [...new Set(detectedTerms)],
      explanation: this.generateAgeBiasExplanation(youngTerms.length, oldTerms.length, stereotypeTerms.length)
    };
  }

  private detectReligionBias(tokens: string[], content: string): any {
    const detectedTerms: string[] = [];
    let biasScore = 0;

    const religionTerms = tokens.filter(token => 
      this.religionTerms.religions.includes(token)
    );

    const stereotypeTerms = tokens.filter(token => 
      this.religionTerms.stereotypes.includes(token)
    );

    if (religionTerms.length > 0) {
      biasScore += Math.min(religionTerms.length * 0.2, 0.4);
      detectedTerms.push(...religionTerms);
    }

    if (stereotypeTerms.length > 0) {
      biasScore += Math.min(stereotypeTerms.length * 0.4, 0.8);
      detectedTerms.push(...stereotypeTerms);
    }

    return {
      biasType: 'Religion',
      score: Math.min(biasScore, 1.0),
      confidence: this.calculateConfidence(detectedTerms.length, tokens.length),
      detectedTerms: [...new Set(detectedTerms)],
      explanation: this.generateReligionBiasExplanation(religionTerms.length, stereotypeTerms.length)
    };
  }

  private detectNationalityBias(tokens: string[], content: string): any {
    const detectedTerms: string[] = [];
    let biasScore = 0;

    const countryTerms = tokens.filter(token => 
      this.nationalityTerms.countries.includes(token)
    );

    const stereotypeTerms = tokens.filter(token => 
      this.nationalityTerms.stereotypes.includes(token)
    );

    if (countryTerms.length > 0) {
      biasScore += Math.min(countryTerms.length * 0.2, 0.4);
      detectedTerms.push(...countryTerms);
    }

    if (stereotypeTerms.length > 0) {
      biasScore += Math.min(stereotypeTerms.length * 0.4, 0.8);
      detectedTerms.push(...stereotypeTerms);
    }

    return {
      biasType: 'Nationality',
      score: Math.min(biasScore, 1.0),
      confidence: this.calculateConfidence(detectedTerms.length, tokens.length),
      detectedTerms: [...new Set(detectedTerms)],
      explanation: this.generateNationalityBiasExplanation(countryTerms.length, stereotypeTerms.length)
    };
  }  privat
e calculateFairnessMetrics(content: string, analysisType: string): any {
    const metrics: any = {};

    if (analysisType === 'demographic_parity' || analysisType === 'both') {
      metrics.demographicParity = this.calculateDemographicParity(content);
    }

    if (analysisType === 'equalized_odds' || analysisType === 'both') {
      metrics.equalizedOdds = this.calculateEqualizedOdds(content);
    }

    return metrics;
  }

  private calculateDemographicParity(content: string): number {
    // Simplified demographic parity calculation
    // In a real implementation, this would require actual demographic data
    const tokens = natural.WordTokenizer.tokenize(content.toLowerCase());
    
    // Count mentions of different demographic groups
    const genderMentions = tokens.filter(token => 
      [...this.genderTerms.male, ...this.genderTerms.female].includes(token)
    ).length;

    const raceMentions = tokens.filter(token => 
      this.raceTerms.descriptors.includes(token)
    ).length;

    // Calculate parity score (0 = perfect parity, 1 = maximum disparity)
    const totalMentions = genderMentions + raceMentions;
    if (totalMentions === 0) return 0;

    const imbalance = Math.abs(genderMentions - raceMentions) / totalMentions;
    return Math.min(imbalance, 1.0);
  }

  private calculateEqualizedOdds(content: string): number {
    // Simplified equalized odds calculation
    // This would require actual prediction outcomes in a real scenario
    const tokens = natural.WordTokenizer.tokenize(content.toLowerCase());
    
    // Look for outcome-related terms
    const positiveOutcomes = tokens.filter(token => 
      ['success', 'qualified', 'approved', 'accepted', 'promoted'].includes(token)
    ).length;

    const negativeOutcomes = tokens.filter(token => 
      ['failure', 'unqualified', 'rejected', 'denied', 'demoted'].includes(token)
    ).length;

    const totalOutcomes = positiveOutcomes + negativeOutcomes;
    if (totalOutcomes === 0) return 0;

    // Calculate odds difference (simplified)
    const oddsImbalance = Math.abs(positiveOutcomes - negativeOutcomes) / totalOutcomes;
    return Math.min(oddsImbalance, 1.0);
  }

  private analyzeGenderedPatterns(content: string): string[] {
    const patterns: string[] = [];
    const lowerContent = content.toLowerCase();

    // Check for gendered assumptions
    const genderedAssumptions = [
      'he must be', 'she must be', 'men are', 'women are',
      'boys will', 'girls will', 'typical man', 'typical woman'
    ];

    genderedAssumptions.forEach(pattern => {
      if (lowerContent.includes(pattern)) {
        patterns.push(pattern);
      }
    });

    return patterns;
  }

  private analyzeRacialPatterns(content: string): string[] {
    const patterns: string[] = [];
    const lowerContent = content.toLowerCase();

    // Check for problematic racial patterns
    const problematicPatterns = [
      'articulate for a', 'well-spoken for a', 'exotic looking',
      'you people', 'one of the good ones', 'not like other'
    ];

    problematicPatterns.forEach(pattern => {
      if (lowerContent.includes(pattern)) {
        patterns.push(pattern);
      }
    });

    return patterns;
  }

  private calculateConfidence(detectedTermsCount: number, totalTokens: number): number {
    if (totalTokens === 0) return 0;
    
    // Confidence based on the ratio of detected terms to total tokens
    const ratio = detectedTermsCount / totalTokens;
    return Math.min(ratio * 5, 1.0); // Scale up for better sensitivity
  }

  private generateRecommendations(biasDetections: any[], overallBiasScore: number): string[] {
    const recommendations: string[] = [];

    if (overallBiasScore > 0.8) {
      recommendations.push('High bias detected - content should be reviewed and revised before publication');
    } else if (overallBiasScore > 0.6) {
      recommendations.push('Moderate bias detected - consider revising language to be more inclusive');
    } else if (overallBiasScore > 0.3) {
      recommendations.push('Low bias detected - minor language adjustments recommended');
    }

    biasDetections.forEach(detection => {
      switch (detection.biasType) {
        case 'Gender':
          recommendations.push('Use gender-neutral language where possible');
          break;
        case 'Race':
          recommendations.push('Avoid racial descriptors unless necessary for context');
          break;
        case 'Age':
          recommendations.push('Focus on qualifications rather than age-related characteristics');
          break;
        case 'Religion':
          recommendations.push('Ensure religious references are respectful and necessary');
          break;
        case 'Nationality':
          recommendations.push('Avoid nationality-based assumptions or stereotypes');
          break;
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('No significant bias detected - content appears inclusive');
    }

    return [...new Set(recommendations)];
  }

  private generateGenderBiasExplanation(maleTerms: number, femaleTerms: number, stereotypes: number): string {
    let explanation = '';
    
    if (maleTerms > femaleTerms * 2) {
      explanation += 'Content heavily favors male-gendered language. ';
    } else if (femaleTerms > maleTerms * 2) {
      explanation += 'Content heavily favors female-gendered language. ';
    }
    
    if (stereotypes > 0) {
      explanation += `${stereotypes} gender stereotype(s) detected. `;
    }
    
    return explanation || 'Balanced gender representation detected.';
  }

  private generateRacialBiasExplanation(descriptors: number, stereotypes: number): string {
    let explanation = '';
    
    if (descriptors > 0) {
      explanation += `${descriptors} racial descriptor(s) found. `;
    }
    
    if (stereotypes > 0) {
      explanation += `${stereotypes} potential racial stereotype(s) detected. `;
    }
    
    return explanation || 'No significant racial bias indicators found.';
  }

  private generateAgeBiasExplanation(youngTerms: number, oldTerms: number, stereotypes: number): string {
    let explanation = '';
    
    if (youngTerms > oldTerms * 2) {
      explanation += 'Content favors younger age groups. ';
    } else if (oldTerms > youngTerms * 2) {
      explanation += 'Content favors older age groups. ';
    }
    
    if (stereotypes > 0) {
      explanation += `${stereotypes} age-related stereotype(s) detected. `;
    }
    
    return explanation || 'Balanced age representation detected.';
  }

  private generateReligionBiasExplanation(religionTerms: number, stereotypes: number): string {
    let explanation = '';
    
    if (religionTerms > 0) {
      explanation += `${religionTerms} religious reference(s) found. `;
    }
    
    if (stereotypes > 0) {
      explanation += `${stereotypes} potential religious stereotype(s) detected. `;
    }
    
    return explanation || 'No significant religious bias indicators found.';
  }

  private generateNationalityBiasExplanation(countryTerms: number, stereotypes: number): string {
    let explanation = '';
    
    if (countryTerms > 0) {
      explanation += `${countryTerms} nationality reference(s) found. `;
    }
    
    if (stereotypes > 0) {
      explanation += `${stereotypes} potential nationality stereotype(s) detected. `;
    }
    
    return explanation || 'No significant nationality bias indicators found.';
  }

  private generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  // Public method to add custom bias terms
  public addCustomBiasTerms(category: string, terms: string[]): void {
    switch (category.toLowerCase()) {
      case 'gender':
        this.genderTerms.stereotypes.push(...terms);
        break;
      case 'race':
        this.raceTerms.stereotypes.push(...terms);
        break;
      case 'age':
        this.ageTerms.stereotypes.push(...terms);
        break;
      case 'religion':
        this.religionTerms.stereotypes.push(...terms);
        break;
      case 'nationality':
        this.nationalityTerms.stereotypes.push(...terms);
        break;
    }
  }

  // Method to get bias detection statistics
  public getBiasDetectionStats(): any {
    return {
      genderTermsCount: Object.values(this.genderTerms).flat().length,
      raceTermsCount: Object.values(this.raceTerms).flat().length,
      ageTermsCount: Object.values(this.ageTerms).flat().length,
      religionTermsCount: Object.values(this.religionTerms).flat().length,
      nationalityTermsCount: Object.values(this.nationalityTerms).flat().length
    };
  }
}