const { faker } = require('@faker-js/faker');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');

class DemoDataGenerator {
  constructor() {
    this.users = [];
    this.submissions = [];
    this.feedback = [];
    this.gamificationData = [];
    this.analyticsData = [];
    this.competitionData = [];
    this.campaignData = [];
    this.externalAchievements = [];
    
    // Demo configuration
    this.config = {
      studentCount: 50,
      teacherCount: 5,
      adminCount: 2,
      submissionsPerStudent: 15,
      timeRangeMonths: 3,
      competitionCount: 8,
      campaignCount: 4,
      programmingLanguages: ['javascript', 'python', 'java', 'typescript', 'go'],
      submissionTypes: ['assignment', 'project', 'challenge'],
      difficultyLevels: ['beginner', 'intermediate', 'advanced'],
      skillTags: [
        'algorithms', 'data-structures', 'web-development', 'api-design',
        'database', 'testing', 'devops', 'security', 'performance',
        'clean-code', 'design-patterns', 'microservices', 'docker',
        'kubernetes', 'ci-cd', 'monitoring', 'logging'
      ],
      externalPlatforms: ['github', 'gitlab', 'hacktoberfest', 'codechef', 'leetcode'],
      competitionTypes: ['hackathon', 'coding-contest', 'open-source', 'ctf', 'algorithm-challenge']
    };
  }

  generateUsers() {
    console.log('🧑‍🎓 Generating demo users...');
    
    // Generate students
    for (let i = 0; i < this.config.studentCount; i++) {
      const user = {
        id: uuidv4(),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: 'student',
        avatar: faker.image.avatar(),
        joinedAt: faker.date.between({
          from: moment().subtract(6, 'months').toDate(),
          to: moment().subtract(1, 'month').toDate()
        }),
        preferences: {
          theme: faker.helpers.arrayElement(['light', 'dark']),
          notifications: faker.datatype.boolean(),
          language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de'])
        },
        profile: {
          bio: faker.lorem.sentence(),
          university: faker.company.name() + ' University',
          major: faker.helpers.arrayElement([
            'Computer Science', 'Software Engineering', 'Information Technology',
            'Data Science', 'Cybersecurity', 'Computer Engineering'
          ]),
          graduationYear: faker.date.future({ years: 3 }).getFullYear(),
          skills: faker.helpers.arrayElements(this.config.skillTags, { min: 3, max: 8 }),
          githubUsername: faker.internet.username(),
          linkedinProfile: `https://linkedin.com/in/${faker.internet.username()}`
        }
      };
      this.users.push(user);
    }

    // Generate teachers
    for (let i = 0; i < this.config.teacherCount; i++) {
      const user = {
        id: uuidv4(),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: 'teacher',
        avatar: faker.image.avatar(),
        joinedAt: faker.date.between({
          from: moment().subtract(2, 'years').toDate(),
          to: moment().subtract(6, 'months').toDate()
        }),
        preferences: {
          theme: 'light',
          notifications: true,
          language: 'en'
        },
        profile: {
          bio: faker.lorem.paragraph(),
          university: faker.company.name() + ' University',
          department: 'Computer Science',
          title: faker.helpers.arrayElement([
            'Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'
          ]),
          expertise: faker.helpers.arrayElements(this.config.skillTags, { min: 5, max: 12 }),
          yearsExperience: faker.number.int({ min: 5, max: 20 }),
          publications: faker.number.int({ min: 10, max: 50 })
        }
      };
      this.users.push(user);
    }

    // Generate admins
    for (let i = 0; i < this.config.adminCount; i++) {
      const user = {
        id: uuidv4(),
        email: i === 0 ? 'admin@aiops-platform.com' : faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: 'admin',
        avatar: faker.image.avatar(),
        joinedAt: faker.date.between({
          from: moment().subtract(3, 'years').toDate(),
          to: moment().subtract(1, 'year').toDate()
        }),
        preferences: {
          theme: 'dark',
          notifications: true,
          language: 'en'
        },
        profile: {
          bio: 'Platform administrator with expertise in educational technology',
          department: 'IT Administration',
          title: 'System Administrator',
          permissions: ['user_management', 'system_config', 'analytics_access', 'security_management']
        }
      };
      this.users.push(user);
    }

    console.log(`✅ Generated ${this.users.length} users (${this.config.studentCount} students, ${this.config.teacherCount} teachers, ${this.config.adminCount} admins)`);
  }

  generateSubmissions() {
    console.log('📝 Generating demo submissions...');
    
    const students = this.users.filter(u => u.role === 'student');
    const codeExamples = this.getCodeExamples();
    
    students.forEach(student => {
      const submissionCount = faker.number.int({ 
        min: Math.floor(this.config.submissionsPerStudent * 0.7), 
        max: this.config.submissionsPerStudent 
      });
      
      // Create performance trend for student (improving, stable, or declining)
      const performanceTrend = faker.helpers.arrayElement(['improving', 'stable', 'declining']);
      let baseQuality = faker.number.float({ min: 0.4, max: 0.9 });
      
      for (let i = 0; i < submissionCount; i++) {
        const submissionDate = faker.date.between({
          from: moment().subtract(this.config.timeRangeMonths, 'months').toDate(),
          to: new Date()
        });
        
        // Adjust quality based on trend and time
        let qualityScore = baseQuality;
        const timeProgress = i / submissionCount;
        
        if (performanceTrend === 'improving') {
          qualityScore += timeProgress * 0.3;
        } else if (performanceTrend === 'declining') {
          qualityScore -= timeProgress * 0.2;
        }
        
        qualityScore = Math.max(0.1, Math.min(1.0, qualityScore + faker.number.float({ min: -0.1, max: 0.1 })));
        
        const language = faker.helpers.arrayElement(this.config.programmingLanguages);
        const submissionType = faker.helpers.arrayElement(this.config.submissionTypes);
        const difficulty = faker.helpers.arrayElement(this.config.difficultyLevels);
        
        const status = faker.helpers.weightedArrayElement([
          { weight: 85, value: 'completed' },
          { weight: 10, value: 'processing' },
          { weight: 5, value: 'failed' }
        ]);

        const submission = {
          id: uuidv4(),
          userId: student.id,
          repositoryUrl: `https://github.com/${student.profile.githubUsername}/${faker.lorem.slug()}`,
          commitHash: faker.git.commitSha(),
          submissionType,
          status,
          codeContent: codeExamples[language][Math.floor(Math.random() * codeExamples[language].length)],
          metadata: {
            language,
            framework: this.getFrameworkForLanguage(language),
            difficulty,
            tags: faker.helpers.arrayElements(this.config.skillTags, { min: 2, max: 5 }),
            estimatedTime: faker.number.int({ min: 30, max: 480 }), // minutes
            assignment: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ${submissionType} #${i + 1}`
          },
          metrics: {
            linesOfCode: faker.number.int({ min: 50, max: 500 }),
            complexity: faker.number.float({ min: 1, max: 10 }),
            testCoverage: faker.number.float({ min: 0, max: 1 }),
            securityVulnerabilities: faker.number.int({ min: 0, max: 5 }),
            codeQuality: qualityScore,
            completionTime: faker.number.int({ min: 15, max: 300 }) // minutes
          },
          createdAt: submissionDate,
          completedAt: status === 'completed' ? 
            moment(submissionDate).add(faker.number.int({ min: 15, max: 180 }), 'minutes').toDate() : 
            null
        };
        
        this.submissions.push(submission);
      }
    });

    console.log(`✅ Generated ${this.submissions.length} submissions`);
  }

  generateFeedback() {
    console.log('💬 Generating AI feedback data...');
    
    const completedSubmissions = this.submissions.filter(s => s.status === 'completed');
    
    completedSubmissions.forEach(submission => {
      const qualityScore = submission.metrics.codeQuality;
      const securityScore = Math.max(0.3, qualityScore + faker.number.float({ min: -0.2, max: 0.2 }));
      
      const feedback = {
        id: uuidv4(),
        submissionId: submission.id,
        userId: submission.userId,
        overallScore: qualityScore,
        securityScore,
        codeQuality: {
          score: qualityScore,
          issues: this.generateCodeIssues(qualityScore)
        },
        suggestions: this.generateSuggestions(submission.metadata.language, qualityScore),
        learningResources: this.generateLearningResources(submission.metadata.tags),
        processingTime: faker.number.int({ min: 5, max: 30 }), // seconds
        confidence: faker.number.float({ min: 0.7, max: 0.95 }),
        createdAt: moment(submission.completedAt).add(faker.number.int({ min: 1, max: 10 }), 'seconds').toDate()
      };
      
      this.feedback.push(feedback);
    });

    console.log(`✅ Generated ${this.feedback.length} feedback entries`);
  }

  generateGamificationData() {
    console.log('🎮 Generating gamification data...');
    
    const students = this.users.filter(u => u.role === 'student');
    const badges = this.getBadgeDefinitions();
    
    students.forEach(student => {
      const studentSubmissions = this.submissions.filter(s => s.userId === student.id && s.status === 'completed');
      const studentFeedback = this.feedback.filter(f => f.userId === student.id);
      
      // Calculate points based on submissions and quality
      let totalPoints = 0;
      const earnedBadges = [];
      const achievements = [];
      
      studentSubmissions.forEach((submission, index) => {
        const basePoints = this.getBasePointsForSubmission(submission);
        const qualityMultiplier = submission.metrics.codeQuality;
        const points = Math.floor(basePoints * qualityMultiplier);
        totalPoints += points;
        
        // Check for badge eligibility
        this.checkBadgeEligibility(student, studentSubmissions.slice(0, index + 1), badges, earnedBadges);
      });
      
      // Calculate level based on points
      const level = Math.floor(totalPoints / 1000) + 1;
      
      // Calculate streaks
      const currentStreak = this.calculateCurrentStreak(studentSubmissions);
      const longestStreak = this.calculateLongestStreak(studentSubmissions);
      
      const gamificationProfile = {
        id: uuidv4(),
        userId: student.id,
        totalPoints,
        level,
        badges: earnedBadges,
        achievements,
        streaks: {
          current: currentStreak,
          longest: longestStreak
        },
        leaderboardRank: 0, // Will be calculated after all students
        statistics: {
          totalSubmissions: studentSubmissions.length,
          averageScore: studentFeedback.length > 0 ? 
            studentFeedback.reduce((sum, f) => sum + f.overallScore, 0) / studentFeedback.length : 0,
          bestSubmissionScore: studentFeedback.length > 0 ? 
            Math.max(...studentFeedback.map(f => f.overallScore)) : 0,
          favoriteLanguage: this.getFavoriteLanguage(studentSubmissions),
          totalCodeLines: studentSubmissions.reduce((sum, s) => sum + s.metrics.linesOfCode, 0)
        },
        updatedAt: new Date()
      };
      
      this.gamificationData.push(gamificationProfile);
    });
    
    // Calculate leaderboard rankings
    this.gamificationData.sort((a, b) => b.totalPoints - a.totalPoints);
    this.gamificationData.forEach((profile, index) => {
      profile.leaderboardRank = index + 1;
    });

    console.log(`✅ Generated gamification data for ${this.gamificationData.length} students`);
  }

  generateAnalyticsData() {
    console.log('📊 Generating analytics data...');
    
    const students = this.users.filter(u => u.role === 'student');
    
    students.forEach(student => {
      const studentSubmissions = this.submissions.filter(s => s.userId === student.id);
      const studentFeedback = this.feedback.filter(f => f.userId === student.id);
      const studentGamification = this.gamificationData.find(g => g.userId === student.id);
      
      if (studentSubmissions.length === 0) return;
      
      // Calculate risk score based on recent performance
      const recentSubmissions = studentSubmissions
        .filter(s => moment(s.createdAt).isAfter(moment().subtract(2, 'weeks')))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      let riskScore = 0.3; // Base risk
      
      if (recentSubmissions.length === 0) {
        riskScore = 0.8; // High risk if no recent activity
      } else {
        const avgRecentQuality = recentSubmissions.reduce((sum, s) => sum + s.metrics.codeQuality, 0) / recentSubmissions.length;
        const submissionFrequency = recentSubmissions.length / 14; // submissions per day
        
        riskScore = Math.max(0.1, Math.min(0.9, 
          0.5 - (avgRecentQuality - 0.5) * 0.6 - (submissionFrequency - 0.5) * 0.2
        ));
      }
      
      // Determine performance trend
      const performanceTrend = this.calculatePerformanceTrend(studentSubmissions);
      
      const analyticsProfile = {
        id: uuidv4(),
        userId: student.id,
        riskScore,
        performanceTrend,
        metrics: {
          averageCodeQuality: studentFeedback.length > 0 ? 
            studentFeedback.reduce((sum, f) => sum + f.overallScore, 0) / studentFeedback.length : 0,
          averageCompletionTime: studentSubmissions.length > 0 ?
            studentSubmissions.reduce((sum, s) => sum + (s.metrics.completionTime || 0), 0) / studentSubmissions.length : 0,
          averageTestCoverage: studentSubmissions.length > 0 ?
            studentSubmissions.reduce((sum, s) => sum + s.metrics.testCoverage, 0) / studentSubmissions.length : 0,
          totalSubmissions: studentSubmissions.length,
          successRate: studentSubmissions.filter(s => s.status === 'completed').length / studentSubmissions.length,
          engagementScore: this.calculateEngagementScore(student, studentSubmissions)
        },
        predictions: {
          nextSubmissionQuality: Math.max(0.1, Math.min(1.0, 
            (studentFeedback.slice(-3).reduce((sum, f) => sum + f.overallScore, 0) / Math.min(3, studentFeedback.length)) + 
            faker.number.float({ min: -0.1, max: 0.1 })
          )),
          timeToNextSubmission: faker.number.int({ min: 1, max: 7 }), // days
          skillGrowthRate: faker.number.float({ min: 0.05, max: 0.25 })
        },
        alerts: this.generateAlerts(riskScore, performanceTrend, recentSubmissions),
        lastUpdated: new Date()
      };
      
      this.analyticsData.push(analyticsProfile);
    });

    console.log(`✅ Generated analytics data for ${this.analyticsData.length} students`);
  }

  // Helper methods
  getCodeExamples() {
    return {
      javascript: [
        `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

module.exports = fibonacci;`,
        `const express = require('express');
const app = express();

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`,
        `class BinarySearchTree {
  constructor() {
    this.root = null;
  }
  
  insert(value) {
    const newNode = { value, left: null, right: null };
    if (!this.root) {
      this.root = newNode;
      return;
    }
    
    let current = this.root;
    while (true) {
      if (value < current.value) {
        if (!current.left) {
          current.left = newNode;
          break;
        }
        current = current.left;
      } else {
        if (!current.right) {
          current.right = newNode;
          break;
        }
        current = current.right;
      }
    }
  }
}`
      ],
      python: [
        `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quicksort(left) + middle + quicksort(right)`,
        `from flask import Flask, jsonify
import sqlite3

app = Flask(__name__)

@app.route('/api/data')
def get_data():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users')
    data = cursor.fetchall()
    conn.close()
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)`,
        `class LinkedList:
    def __init__(self):
        self.head = None
    
    def append(self, data):
        new_node = Node(data)
        if not self.head:
            self.head = new_node
            return
        current = self.head
        while current.next:
            current = current.next
        current.next = new_node
    
    def display(self):
        elements = []
        current = self.head
        while current:
            elements.append(current.data)
            current = current.next
        return elements`
      ],
      java: [
        `public class MergeSort {
    public static void mergeSort(int[] arr, int left, int right) {
        if (left < right) {
            int mid = (left + right) / 2;
            mergeSort(arr, left, mid);
            mergeSort(arr, mid + 1, right);
            merge(arr, left, mid, right);
        }
    }
    
    private static void merge(int[] arr, int left, int mid, int right) {
        int[] temp = new int[right - left + 1];
        int i = left, j = mid + 1, k = 0;
        
        while (i <= mid && j <= right) {
            if (arr[i] <= arr[j]) {
                temp[k++] = arr[i++];
            } else {
                temp[k++] = arr[j++];
            }
        }
        
        while (i <= mid) temp[k++] = arr[i++];
        while (j <= right) temp[k++] = arr[j++];
        
        System.arraycopy(temp, 0, arr, left, temp.length);
    }
}`,
        `import java.util.*;

public class GraphTraversal {
    private Map<Integer, List<Integer>> adjacencyList;
    
    public GraphTraversal() {
        this.adjacencyList = new HashMap<>();
    }
    
    public void addEdge(int source, int destination) {
        adjacencyList.computeIfAbsent(source, k -> new ArrayList<>()).add(destination);
        adjacencyList.computeIfAbsent(destination, k -> new ArrayList<>()).add(source);
    }
    
    public List<Integer> bfs(int start) {
        List<Integer> result = new ArrayList<>();
        Set<Integer> visited = new HashSet<>();
        Queue<Integer> queue = new LinkedList<>();
        
        queue.offer(start);
        visited.add(start);
        
        while (!queue.isEmpty()) {
            int current = queue.poll();
            result.add(current);
            
            for (int neighbor : adjacencyList.getOrDefault(current, new ArrayList<>())) {
                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);
                    queue.offer(neighbor);
                }
            }
        }
        
        return result;
    }
}`
      ],
      typescript: [
        `interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

class UserService {
  private users: User[] = [];
  
  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...userData
    };
    
    this.users.push(user);
    return user;
  }
  
  async getUserById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }
  
  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;
    
    this.users[userIndex] = { ...this.users[userIndex], ...updates };
    return this.users[userIndex];
  }
}`,
        `type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchUserData(userId: string): Promise<Result<User>> {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    if (!response.ok) {
      return { success: false, error: new Error('User not found') };
    }
    
    const userData = await response.json();
    return { success: true, data: userData };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}`
      ],
      go: [
        `package main

import (
    "fmt"
    "sort"
)

func twoSum(nums []int, target int) []int {
    numMap := make(map[int]int)
    
    for i, num := range nums {
        complement := target - num
        if index, exists := numMap[complement]; exists {
            return []int{index, i}
        }
        numMap[num] = i
    }
    
    return nil
}

func main() {
    nums := []int{2, 7, 11, 15}
    target := 9
    result := twoSum(nums, target)
    fmt.Println(result)
}`,
        `package main

import (
    "encoding/json"
    "log"
    "net/http"
    "github.com/gorilla/mux"
)

type User struct {
    ID    string \`json:"id"\`
    Name  string \`json:"name"\`
    Email string \`json:"email"\`
}

var users []User

func getUsers(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(users)
}

func createUser(w http.ResponseWriter, r *http.Request) {
    var user User
    json.NewDecoder(r.Body).Decode(&user)
    users = append(users, user)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func main() {
    r := mux.NewRouter()
    r.HandleFunc("/users", getUsers).Methods("GET")
    r.HandleFunc("/users", createUser).Methods("POST")
    
    log.Fatal(http.ListenAndServe(":8000", r))
}`
      ]
    };
  }

  getFrameworkForLanguage(language) {
    const frameworks = {
      javascript: ['Express.js', 'React', 'Vue.js', 'Node.js', 'Next.js'],
      python: ['Flask', 'Django', 'FastAPI', 'Pandas', 'NumPy'],
      java: ['Spring Boot', 'Spring MVC', 'Hibernate', 'Maven', 'Gradle'],
      typescript: ['Angular', 'React', 'NestJS', 'Express.js', 'Vue.js'],
      go: ['Gin', 'Echo', 'Gorilla Mux', 'Fiber', 'Buffalo']
    };
    
    return faker.helpers.arrayElement(frameworks[language] || ['None']);
  }

  generateCodeIssues(qualityScore) {
    const issueCount = Math.floor((1 - qualityScore) * 8);
    const issues = [];
    
    const possibleIssues = [
      { type: 'style', severity: 'low', message: 'Inconsistent indentation detected' },
      { type: 'complexity', severity: 'medium', message: 'Function complexity is too high' },
      { type: 'naming', severity: 'low', message: 'Variable names should be more descriptive' },
      { type: 'security', severity: 'high', message: 'Potential SQL injection vulnerability' },
      { type: 'performance', severity: 'medium', message: 'Inefficient algorithm detected' },
      { type: 'maintainability', severity: 'medium', message: 'Code duplication found' },
      { type: 'testing', severity: 'low', message: 'Missing unit tests for this function' },
      { type: 'documentation', severity: 'low', message: 'Function lacks proper documentation' }
    ];
    
    for (let i = 0; i < issueCount; i++) {
      const issue = faker.helpers.arrayElement(possibleIssues);
      issues.push({
        ...issue,
        line: faker.number.int({ min: 1, max: 100 })
      });
    }
    
    return issues;
  }

  generateSuggestions(language, qualityScore) {
    const suggestions = [
      {
        category: 'Code Quality',
        message: 'Consider breaking down large functions into smaller, more focused ones',
        priority: 'medium'
      },
      {
        category: 'Performance',
        message: 'Use more efficient data structures for better performance',
        priority: 'high'
      },
      {
        category: 'Security',
        message: 'Always validate and sanitize user input',
        priority: 'high'
      },
      {
        category: 'Testing',
        message: 'Add unit tests to improve code reliability',
        priority: 'medium'
      },
      {
        category: 'Documentation',
        message: 'Add comments to explain complex logic',
        priority: 'low'
      }
    ];
    
    const suggestionCount = Math.floor((1 - qualityScore) * 3) + 1;
    return faker.helpers.arrayElements(suggestions, suggestionCount);
  }

  generateLearningResources(tags) {
    const resources = [
      {
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        url: 'https://example.com/clean-code',
        type: 'documentation'
      },
      {
        title: 'Algorithm Design Patterns Tutorial',
        url: 'https://example.com/algorithms',
        type: 'tutorial'
      },
      {
        title: 'Security Best Practices Guide',
        url: 'https://example.com/security',
        type: 'documentation'
      },
      {
        title: 'Performance Optimization Examples',
        url: 'https://example.com/performance',
        type: 'example'
      },
      {
        title: 'Unit Testing Fundamentals',
        url: 'https://example.com/testing',
        type: 'tutorial'
      }
    ];
    
    return faker.helpers.arrayElements(resources, { min: 1, max: 3 });
  }

  getBadgeDefinitions() {
    return [
      {
        id: 'first-submission',
        name: 'First Steps',
        description: 'Completed your first submission',
        icon: '🎯',
        criteria: { submissionCount: 1 }
      },
      {
        id: 'streak-master',
        name: 'Streak Master',
        description: 'Maintained a 7-day submission streak',
        icon: '🔥',
        criteria: { streak: 7 }
      },
      {
        id: 'quality-coder',
        name: 'Quality Coder',
        description: 'Achieved 90%+ code quality score',
        icon: '⭐',
        criteria: { qualityScore: 0.9 }
      },
      {
        id: 'speed-demon',
        name: 'Speed Demon',
        description: 'Completed 10 submissions in one week',
        icon: '⚡',
        criteria: { weeklySubmissions: 10 }
      },
      {
        id: 'security-expert',
        name: 'Security Expert',
        description: 'Zero security vulnerabilities in 5 consecutive submissions',
        icon: '🛡️',
        criteria: { secureSubmissions: 5 }
      }
    ];
  }

  checkBadgeEligibility(student, submissions, badges, earnedBadges) {
    badges.forEach(badge => {
      if (earnedBadges.find(b => b.id === badge.id)) return; // Already earned
      
      let eligible = false;
      
      switch (badge.id) {
        case 'first-submission':
          eligible = submissions.length >= 1;
          break;
        case 'streak-master':
          eligible = this.calculateCurrentStreak(submissions) >= 7;
          break;
        case 'quality-coder':
          eligible = submissions.some(s => s.metrics.codeQuality >= 0.9);
          break;
        case 'speed-demon':
          const weekAgo = moment().subtract(7, 'days');
          const recentSubmissions = submissions.filter(s => moment(s.createdAt).isAfter(weekAgo));
          eligible = recentSubmissions.length >= 10;
          break;
        case 'security-expert':
          const lastFive = submissions.slice(-5);
          eligible = lastFive.length >= 5 && lastFive.every(s => s.metrics.securityVulnerabilities === 0);
          break;
      }
      
      if (eligible) {
        earnedBadges.push({
          ...badge,
          earnedAt: faker.date.between({
            from: moment().subtract(2, 'months').toDate(),
            to: new Date()
          })
        });
      }
    });
  }

  getBasePointsForSubmission(submission) {
    const basePoints = {
      assignment: 100,
      project: 200,
      challenge: 150
    };
    
    const difficultyMultiplier = {
      beginner: 1.0,
      intermediate: 1.5,
      advanced: 2.0
    };
    
    return basePoints[submission.submissionType] * difficultyMultiplier[submission.metadata.difficulty];
  }

  calculateCurrentStreak(submissions) {
    if (submissions.length === 0) return 0;
    
    const sortedSubmissions = submissions
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    let streak = 0;
    let currentDate = moment();
    
    for (const submission of sortedSubmissions) {
      const submissionDate = moment(submission.createdAt);
      const daysDiff = currentDate.diff(submissionDate, 'days');
      
      if (daysDiff <= 1) {
        streak++;
        currentDate = submissionDate;
      } else {
        break;
      }
    }
    
    return streak;
  }

  calculateLongestStreak(submissions) {
    if (submissions.length === 0) return 0;
    
    const sortedSubmissions = submissions
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    let maxStreak = 0;
    let currentStreak = 0;
    let lastDate = null;
    
    for (const submission of sortedSubmissions) {
      const submissionDate = moment(submission.createdAt);
      
      if (!lastDate || submissionDate.diff(lastDate, 'days') <= 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
      
      lastDate = submissionDate;
    }
    
    return Math.max(maxStreak, currentStreak);
  }

  getFavoriteLanguage(submissions) {
    const languageCounts = {};
    submissions.forEach(s => {
      const lang = s.metadata.language;
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });
    
    return Object.keys(languageCounts).reduce((a, b) => 
      languageCounts[a] > languageCounts[b] ? a : b
    );
  }

  calculatePerformanceTrend(submissions) {
    if (submissions.length < 3) return 'stable';
    
    const recentSubmissions = submissions
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(-5);
    
    if (recentSubmissions.length < 3) return 'stable';
    
    const firstHalf = recentSubmissions.slice(0, Math.floor(recentSubmissions.length / 2));
    const secondHalf = recentSubmissions.slice(Math.floor(recentSubmissions.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, s) => sum + s.metrics.codeQuality, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.metrics.codeQuality, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    
    if (difference > 0.1) return 'improving';
    if (difference < -0.1) return 'declining';
    return 'stable';
  }

  calculateEngagementScore(student, submissions) {
    const daysSinceJoined = moment().diff(moment(student.joinedAt), 'days');
    const submissionsPerDay = submissions.length / Math.max(daysSinceJoined, 1);
    const recentActivity = submissions.filter(s => 
      moment(s.createdAt).isAfter(moment().subtract(7, 'days'))
    ).length;
    
    return Math.min(1.0, (submissionsPerDay * 10 + recentActivity * 0.1));
  }

  generateAlerts(riskScore, performanceTrend, recentSubmissions) {
    const alerts = [];
    
    if (riskScore > 0.7) {
      alerts.push({
        type: 'high_risk',
        severity: 'high',
        message: 'Student shows high risk of performance decline',
        createdAt: new Date()
      });
    }
    
    if (performanceTrend === 'declining') {
      alerts.push({
        type: 'declining_performance',
        severity: 'medium',
        message: 'Student performance is declining over recent submissions',
        createdAt: new Date()
      });
    }
    
    if (recentSubmissions.length === 0) {
      alerts.push({
        type: 'inactive',
        severity: 'medium',
        message: 'Student has not submitted any work recently',
        createdAt: new Date()
      });
    }
    
    return alerts;
  }

  exportData() {
    return {
      users: this.users,
      submissions: this.submissions,
      feedback: this.feedback,
      gamification: this.gamificationData,
      analytics: this.analyticsData,
      competitions: this.competitionData,
      campaigns: this.campaignData,
      externalAchievements: this.externalAchievements,
      metadata: {
        generatedAt: new Date(),
        totalRecords: this.users.length + this.submissions.length + this.feedback.length + 
                     this.gamificationData.length + this.analyticsData.length + 
                     this.competitionData.length + this.campaignData.length + 
                     this.externalAchievements.length,
        config: this.config,
        summary: {
          users: {
            students: this.users.filter(u => u.role === 'student').length,
            teachers: this.users.filter(u => u.role === 'teacher').length,
            admins: this.users.filter(u => u.role === 'admin').length
          },
          competitions: {
            active: this.competitionData.filter(c => c.status === 'active').length,
            completed: this.competitionData.filter(c => c.status === 'completed').length
          },
          campaigns: {
            active: this.campaignData.filter(c => c.status === 'active').length,
            completed: this.campaignData.filter(c => c.status === 'completed').length,
            totalParticipants: this.campaignData.reduce((sum, c) => sum + c.participants.length, 0)
          },
          achievements: {
            verified: this.externalAchievements.filter(a => a.status === 'verified').length,
            pending: this.externalAchievements.filter(a => a.status === 'pending').length,
            platforms: [...new Set(this.externalAchievements.map(a => a.platform))]
          }
        }
      }
    };
  }

  generateCompetitionData() {
    console.log('🏆 Generating competition data...');
    
    // Generate external competitions
    const competitionTypes = [
      {
        name: 'Hacktoberfest 2024',
        type: 'open-source',
        platform: 'github',
        description: 'Annual open source contribution event',
        startDate: moment().subtract(2, 'months').toDate(),
        endDate: moment().subtract(1, 'month').toDate(),
        requirements: {
          minPullRequests: 4,
          validRepositories: true,
          qualityCheck: true
        },
        rewards: {
          points: 500,
          badge: 'hacktoberfest-2024',
          certificate: true
        }
      },
      {
        name: 'GitHub Arctic Code Vault',
        type: 'open-source',
        platform: 'github',
        description: 'Contribute to projects preserved in Arctic Code Vault',
        startDate: moment().subtract(6, 'months').toDate(),
        endDate: moment().add(6, 'months').toDate(),
        requirements: {
          minContributions: 1,
          archiveEligible: true
        },
        rewards: {
          points: 200,
          badge: 'arctic-contributor',
          certificate: false
        }
      },
      {
        name: 'LeetCode Weekly Contest',
        type: 'algorithm-challenge',
        platform: 'leetcode',
        description: 'Weekly algorithmic programming contest',
        startDate: moment().subtract(1, 'week').toDate(),
        endDate: moment().subtract(1, 'week').add(2, 'hours').toDate(),
        requirements: {
          minProblems: 2,
          timeLimit: 120 // minutes
        },
        rewards: {
          points: 150,
          badge: 'leetcode-weekly',
          certificate: false
        }
      },
      {
        name: 'CodeChef Long Challenge',
        type: 'coding-contest',
        platform: 'codechef',
        description: 'Monthly long programming contest',
        startDate: moment().subtract(3, 'weeks').toDate(),
        endDate: moment().subtract(2, 'weeks').toDate(),
        requirements: {
          minSubmissions: 3,
          correctSolutions: 1
        },
        rewards: {
          points: 300,
          badge: 'codechef-challenger',
          certificate: true
        }
      },
      {
        name: 'Cybersecurity CTF Championship',
        type: 'ctf',
        platform: 'ctftime',
        description: 'Capture The Flag cybersecurity competition',
        startDate: moment().subtract(5, 'weeks').toDate(),
        endDate: moment().subtract(5, 'weeks').add(48, 'hours').toDate(),
        requirements: {
          minFlags: 5,
          teamParticipation: true
        },
        rewards: {
          points: 400,
          badge: 'ctf-champion',
          certificate: true
        }
      },
      {
        name: 'Google Summer of Code',
        type: 'open-source',
        platform: 'github',
        description: 'Global program for university students in open source',
        startDate: moment().subtract(4, 'months').toDate(),
        endDate: moment().add(2, 'months').toDate(),
        requirements: {
          projectCompletion: true,
          mentorApproval: true,
          finalEvaluation: true
        },
        rewards: {
          points: 1000,
          badge: 'gsoc-participant',
          certificate: true
        }
      },
      {
        name: 'DevOps Days Hackathon',
        type: 'hackathon',
        platform: 'github',
        description: 'Infrastructure and automation focused hackathon',
        startDate: moment().subtract(6, 'weeks').toDate(),
        endDate: moment().subtract(6, 'weeks').add(72, 'hours').toDate(),
        requirements: {
          teamSize: { min: 2, max: 5 },
          deploymentDemo: true,
          cicdPipeline: true
        },
        rewards: {
          points: 600,
          badge: 'devops-innovator',
          certificate: true
        }
      },
      {
        name: 'AI/ML Code Challenge',
        type: 'algorithm-challenge',
        platform: 'kaggle',
        description: 'Machine learning and AI programming challenge',
        startDate: moment().subtract(8, 'weeks').toDate(),
        endDate: moment().subtract(6, 'weeks').toDate(),
        requirements: {
          modelAccuracy: 0.85,
          codeQuality: true,
          documentation: true
        },
        rewards: {
          points: 450,
          badge: 'ai-challenger',
          certificate: true
        }
      }
    ];

    competitionTypes.forEach(comp => {
      const competition = {
        id: uuidv4(),
        ...comp,
        participantCount: faker.number.int({ min: 50, max: 5000 }),
        status: moment().isAfter(comp.endDate) ? 'completed' : 'active',
        createdAt: moment(comp.startDate).subtract(2, 'weeks').toDate()
      };
      this.competitionData.push(competition);
    });

    console.log(`✅ Generated ${this.competitionData.length} competitions`);
  }

  generateCampaignData() {
    console.log('📋 Generating campaign data...');
    
    const teachers = this.users.filter(u => u.role === 'teacher');
    const competitions = this.competitionData;
    
    teachers.forEach(teacher => {
      // Each teacher creates 1-2 campaigns
      const campaignCount = faker.number.int({ min: 1, max: 2 });
      
      for (let i = 0; i < campaignCount; i++) {
        const competition = faker.helpers.arrayElement(competitions);
        const startDate = faker.date.between({
          from: moment().subtract(2, 'months').toDate(),
          to: moment().subtract(2, 'weeks').toDate()
        });
        
        const campaign = {
          id: uuidv4(),
          name: `${competition.name} - Class Challenge`,
          description: `Participate in ${competition.name} as part of our course curriculum`,
          competitionId: competition.id,
          instructorId: teacher.id,
          startDate,
          endDate: moment(startDate).add(faker.number.int({ min: 2, max: 8 }), 'weeks').toDate(),
          status: faker.helpers.weightedArrayElement([
            { weight: 60, value: 'active' },
            { weight: 30, value: 'completed' },
            { weight: 10, value: 'draft' }
          ]),
          requirements: {
            minParticipation: faker.number.int({ min: 1, max: 5 }),
            gradingWeight: faker.number.float({ min: 0.1, max: 0.3 }),
            bonusPoints: faker.number.int({ min: 50, max: 200 })
          },
          participants: [],
          createdAt: moment(startDate).subtract(1, 'week').toDate()
        };
        
        // Add student participants
        const students = this.users.filter(u => u.role === 'student');
        const participantCount = faker.number.int({ min: 5, max: 15 });
        const selectedStudents = faker.helpers.arrayElements(students, participantCount);
        
        selectedStudents.forEach(student => {
          campaign.participants.push({
            userId: student.id,
            joinedAt: faker.date.between({
              from: campaign.startDate,
              to: moment(campaign.startDate).add(3, 'days').toDate()
            }),
            status: faker.helpers.weightedArrayElement([
              { weight: 70, value: 'active' },
              { weight: 20, value: 'completed' },
              { weight: 10, value: 'dropped' }
            ]),
            progress: {
              completedTasks: faker.number.int({ min: 0, max: 5 }),
              totalTasks: faker.number.int({ min: 3, max: 8 }),
              lastActivity: faker.date.recent({ days: 7 })
            }
          });
        });
        
        this.campaignData.push(campaign);
      }
    });

    console.log(`✅ Generated ${this.campaignData.length} campaigns`);
  }

  generateExternalAchievements() {
    console.log('🏅 Generating external achievements...');
    
    const students = this.users.filter(u => u.role === 'student');
    const competitions = this.competitionData;
    
    students.forEach(student => {
      // 60% of students have some external achievements
      if (faker.datatype.boolean({ probability: 0.6 })) {
        const achievementCount = faker.number.int({ min: 1, max: 4 });
        
        for (let i = 0; i < achievementCount; i++) {
          const competition = faker.helpers.arrayElement(competitions);
          const participationDate = faker.date.between({
            from: competition.startDate,
            to: competition.endDate
          });
          
          const achievement = {
            id: uuidv4(),
            userId: student.id,
            competitionId: competition.id,
            platform: competition.platform,
            type: competition.type,
            status: faker.helpers.weightedArrayElement([
              { weight: 70, value: 'verified' },
              { weight: 20, value: 'pending' },
              { weight: 10, value: 'rejected' }
            ]),
            details: {
              rank: faker.number.int({ min: 1, max: 1000 }),
              score: faker.number.int({ min: 100, max: 2000 }),
              completedTasks: faker.number.int({ min: 1, max: 10 }),
              teamSize: competition.requirements.teamParticipation ? 
                faker.number.int({ min: 2, max: 5 }) : 1
            },
            verification: {
              method: faker.helpers.arrayElement(['api', 'manual', 'certificate']),
              verifiedAt: faker.date.between({
                from: participationDate,
                to: moment(participationDate).add(1, 'week').toDate()
              }),
              verifiedBy: competition.platform,
              confidence: faker.number.float({ min: 0.8, max: 1.0 })
            },
            rewards: {
              pointsAwarded: competition.rewards.points,
              badgeEarned: competition.rewards.badge,
              certificateIssued: competition.rewards.certificate
            },
            externalData: {
              profileUrl: `https://${competition.platform}.com/${student.profile.githubUsername}`,
              submissionUrl: `https://${competition.platform}.com/submission/${faker.string.alphanumeric(8)}`,
              repositoryUrl: competition.platform === 'github' ? 
                `https://github.com/${student.profile.githubUsername}/${faker.lorem.slug()}` : null
            },
            createdAt: participationDate,
            updatedAt: faker.date.between({
              from: participationDate,
              to: moment(participationDate).add(faker.number.int({ min: 1, max: 30 }), 'days').toDate()
            })
          };
          
          this.externalAchievements.push(achievement);
        }
      }
    });

    console.log(`✅ Generated ${this.externalAchievements.length} external achievements`);
  }

  generateAll() {
    console.log('🚀 Starting comprehensive demo data generation...');
    
    this.generateUsers();
    this.generateCompetitionData();
    this.generateCampaignData();
    this.generateSubmissions();
    this.generateFeedback();
    this.generateGamificationData();
    this.generateAnalyticsData();
    this.generateExternalAchievements();
    
    console.log('✅ Comprehensive demo data generation complete!');
    console.log(`📊 Generated: ${this.users.length} users, ${this.submissions.length} submissions, ${this.feedback.length} feedback entries`);
    console.log(`🏆 Generated: ${this.competitionData.length} competitions, ${this.campaignData.length} campaigns, ${this.externalAchievements.length} external achievements`);
    
    return this.exportData();
  }
}

module.exports = DemoDataGenerator;

// Run if called directly
if (require.main === module) {
  const generator = new DemoDataGenerator();
  const data = generator.generateAll();
  
  const fs = require('fs');
  fs.writeFileSync('demo-data.json', JSON.stringify(data, null, 2));
  console.log('💾 Demo data saved to demo-data.json');
}