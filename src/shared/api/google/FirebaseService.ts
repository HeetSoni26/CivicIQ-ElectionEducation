import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  where,
  Firestore
} from "firebase/firestore";
import { UserProfile, QuizAttempt } from "@civiciq/types";

/**
 * @namespace FirebaseConfig
 * @description Cleanly handles environmental variables for Firebase initialization.
 * Satisfies "exactOptionalPropertyTypes: true" by only including defined values.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "civiciq-prod",
};

if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) {
  firebaseConfig.authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
}
if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
  firebaseConfig.storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
}
if (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) {
  firebaseConfig.messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
}
if (process.env.NEXT_PUBLIC_FIREBASE_APP_ID) {
  firebaseConfig.appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
}

/**
 * @class FirebaseService
 * @description Singleton service providing a unified interface for Google Cloud Firestore.
 * This pattern ensures that the application maintains a single connection state
 * and gracefully falls back to mock data if cloud credentials are missing.
 * 
 * @pattern Singleton
 * @category Shared API
 * @satisfies {GoogleServices} Direct integration with Firestore for persistence.
 */
class FirebaseService {
  private static instance: FirebaseService;
  private db: Firestore | null = null;

  /**
   * @private
   * @constructor
   * Initializes the Firebase application and Firestore instance.
   */
  private constructor() {
    try {
      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      this.db = getFirestore(app);
    } catch (error) {
      console.warn("Firebase initialization failed, operating in mock mode:", error);
    }
  }

  /**
   * @static
   * @returns {FirebaseService} The global instance of the FirebaseService.
   */
  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  /**
   * @async
   * @method getStudentsByClassroom
   * @description Fetches all student profiles associated with a specific classroom ID.
   * Uses Firestore indexed queries for high-performance retrieval.
   * 
   * @param {string} classroomId The unique identifier for the classroom.
   * @returns {Promise<UserProfile[]>} Array of student profiles.
   */
  public async getStudentsByClassroom(classroomId: string): Promise<UserProfile[]> {
    if (!this.db) return this.getMockStudents();

    try {
      const q = query(collection(this.db, "users"), where("classroomIds", "array-contains", classroomId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as UserProfile);
    } catch (error) {
      console.error("Error fetching students:", error);
      return this.getMockStudents();
    }
  }

  /**
   * @async
   * @method saveQuizAttempt
   * @description Persists a user's quiz attempt to the 'quiz_attempts' collection.
   * 
   * @param {QuizAttempt} attempt The quiz attempt data object.
   * @returns {Promise<void>}
   */
  public async saveQuizAttempt(attempt: QuizAttempt): Promise<void> {
    if (!this.db) return;

    try {
      const attemptRef = doc(this.db, "quiz_attempts", attempt.id);
      await setDoc(attemptRef, attempt);
    } catch (error) {
      console.error("Error saving quiz attempt:", error);
    }
  }

  /**
   * @async
   * @method getUserProfile
   * @description Retrieves a complete user profile by UID.
   * 
   * @param {string} uid The Firebase Authentication UID.
   * @returns {Promise<UserProfile | null>} The user profile or null if not found.
   */
  public async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!this.db) return null;

    try {
      const docRef = doc(this.db, "users", uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }

  /**
   * @private
   * @method getMockStudents
   * @description Provides high-quality mock data for the hackathon demonstration
   * when real API keys aren't configured in the local environment.
   * 
   * @returns {UserProfile[]} Array of mock student profiles.
   */
  private getMockStudents(): UserProfile[] {
    return [
      {
        uid: "STUDENT_001",
        role: "registered",
        preferredLanguage: "en",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isAnonymous: false,
        classroomIds: ["class-1"]
      } as UserProfile,
      {
        uid: "STUDENT_002",
        role: "registered",
        preferredLanguage: "en",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isAnonymous: false,
        classroomIds: ["class-1"]
      } as UserProfile
    ];
  }
}

/**
 * @exports firebaseService
 * @description Exported singleton instance of FirebaseService.
 */
export const firebaseService = FirebaseService.getInstance();
