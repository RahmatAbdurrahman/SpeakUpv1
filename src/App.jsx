import React, { useEffect, useState } from "react";
import PhoneFrame from "./components/PhoneFrame";
import Onboarding from "./components/Onboarding";
import PositiveAffirmation from "./components/PositiveAffirmation";
import Questionnaires from "./components/Questionnaires";
import RegisterForm from "./components/RegisterForm";
import LoginScreen from "./components/LoginScreen";
import EmailConfirmNotice from "./components/EmailConfirmNotice";
import WelcomingScreen from "./components/WelcomingScreen";
import HomeScreen from "./components/HomeScreen";
import SimulasiScreen from "./components/SimulasiScreen";
import SosialScreen from "./components/SosialScreen";
import LiveRoomScreen from "./components/LiveRoomScreen";
import LivePresentationScreen from "./components/LivePresentationScreen";
import LiveResultsScreen from "./components/LiveResultsScreen";
import ViewerFeedbackScreen from "./components/ViewerFeedbackScreen";
import SessionDetailScreen from "./components/SessionDetailScreen";
import ModuleDetailScreen from "./components/ModuleDetailScreen";
import LessonScreen from "./components/LessonScreen";
import ProfileScreen from "./components/ProfileScreen";
import SettingsScreen from "./components/SettingsScreen";
import { UserProgressProvider } from "./context/UserProgressContext";
import { supabase } from "./lib/supabaseClient";
import { fetchProfile, updateProfile } from "./lib/profile";
import "./App.css";

function App() {
  const [currentScreen, setCurrentScreen] = useState("bootstrap");
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedLiveRoom, setSelectedLiveRoom] = useState(null);
  const [liveResults, setLiveResults] = useState(null); // { sessionId, results } once a Live Presentation ends
  const [viewerFeedbackSessionId, setViewerFeedbackSessionId] = useState(null);
  const [selectedHistorySession, setSelectedHistorySession] = useState(null); // { sessionId, kategori, date, isLive }
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
  });
  const [pendingEmail, setPendingEmail] = useState("");
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState({});

  // Resume an existing Supabase session (if any) straight into Home instead
  // of always starting from onboarding.
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      if (!session) {
        setCurrentScreen("onboarding");
        return;
      }
      try {
        let profile = await fetchProfile(session.user.id);
        if (!active) return;

        // First sign-in via Google (or any OAuth provider) — the trigger
        // only sets a generated username, so borrow the provider's display
        // name for a friendlier greeting on Home.
        if (!profile.nama_panggilan) {
          const providerName =
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name;
          if (providerName) {
            try {
              profile = await updateProfile(session.user.id, {
                nama_panggilan: providerName,
              });
            } catch {
              profile = { ...profile, nama_panggilan: providerName };
            }
          }
        }

        setUserProfile({
          name: profile.nama_panggilan || profile.username || "",
          email: session.user.email,
        });
        setCurrentScreen("home");
      } catch {
        if (active) setCurrentScreen("onboarding");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUserProfile({ name: "", email: "" });
        setCurrentScreen("onboarding");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleStartRegistration = () => {
    setCurrentScreen("affirmation");
  };

  const handleAffirmationContinue = () => {
    setCurrentScreen("questionnaire");
  };

  const handleQuestionnaireBackToAffirmation = () => {
    setCurrentScreen("affirmation");
  };

  const handleQuestionnaireFinish = (answers) => {
    setQuestionnaireAnswers(answers);
    setCurrentScreen("register");
  };

  const handleBackToOnboarding = () => {
    setCurrentScreen("onboarding");
  };

  const handleRegisterComplete = (data) => {
    if (data.pendingConfirmation) {
      setPendingEmail(data.email);
      setCurrentScreen("confirm-email");
      return;
    }
    setUserProfile({
      name: data.name,
      email: data.email,
    });
    // After completing registration, show welcoming screen
    setCurrentScreen("welcoming");
  };

  const handleLoginComplete = (data) => {
    setUserProfile({
      name: data.name,
      email: data.email,
    });
    // Returning user — skip the welcome/intro screen, go straight in.
    setCurrentScreen("home");
  };

  const handleStartApp = () => {
    setCurrentScreen("home");
  };

  const handleSelectModule = (mod) => {
    setSelectedModule(mod);
    setCurrentScreen("module-detail");
  };

  const handleBackToHome = () => {
    setCurrentScreen("home");
  };

  const handleStartLesson = (lessonNum, moduleData) => {
    setSelectedLesson({ lessonNum, moduleData });
    setCurrentScreen("lesson");
  };

  const handleBackToModuleDetail = () => {
    setCurrentScreen("module-detail");
  };

  const handleLessonFinish = () => {
    setCurrentScreen("module-detail");
  };

  const handleJoinRoom = (room) => {
    setSelectedLiveRoom(room);
    setCurrentScreen("live-room");
  };

  const handleLeaveLiveRoom = () => {
    setCurrentScreen("sosial");
  };

  const handleSessionEnded = ({ sessionId, results }) => {
    setLiveResults({ sessionId, results });
    setCurrentScreen("live-results");
  };

  const handleViewViewerFeedback = (sessionId) => {
    setViewerFeedbackSessionId(sessionId);
    setCurrentScreen("viewer-feedback");
  };

  const handleOpenSessionDetail = (session) => {
    setSelectedHistorySession(session);
    setCurrentScreen("session-detail");
  };

  return (
    <UserProgressProvider>
      <PhoneFrame>
        {currentScreen === "bootstrap" && <div className="app-bootstrap-blank" />}

        {currentScreen === "onboarding" && (
          <Onboarding
            onStart={handleStartRegistration}
            onLogin={() => setCurrentScreen("login")}
          />
        )}

        {currentScreen === "affirmation" && (
          <PositiveAffirmation onContinue={handleAffirmationContinue} />
        )}

        {currentScreen === "questionnaire" && (
          <Questionnaires
            onBackToOnboarding={handleQuestionnaireBackToAffirmation}
            onFinish={handleQuestionnaireFinish}
          />
        )}

        {currentScreen === "register" && (
          <RegisterForm
            onComplete={handleRegisterComplete}
            onLogin={() => setCurrentScreen("login")}
            onBackToStart={() => setCurrentScreen("questionnaire")}
            questionnaireAnswers={questionnaireAnswers}
          />
        )}

        {currentScreen === "login" && (
          <LoginScreen
            onComplete={handleLoginComplete}
            onBack={handleBackToOnboarding}
            onNavigateRegister={() => setCurrentScreen("questionnaire")}
          />
        )}

        {currentScreen === "confirm-email" && (
          <EmailConfirmNotice
            email={pendingEmail}
            onGoToLogin={() => setCurrentScreen("login")}
          />
        )}

        {currentScreen === "welcoming" && (
          <WelcomingScreen
            userName={userProfile.name}
            onStartApp={handleStartApp}
          />
        )}

        {currentScreen === "home" && (
          <HomeScreen
            userName={userProfile.name}
            onSelectModule={handleSelectModule}
            onNavigatePractice={() => setCurrentScreen("practice")}
            onNavigateSosial={() => setCurrentScreen("sosial")}
            onNavigateProfile={() => setCurrentScreen("profile")}
          />
        )}

        {currentScreen === "practice" && (
          <SimulasiScreen
            onNavigateHome={() => setCurrentScreen("home")}
            onNavigateSosial={() => setCurrentScreen("sosial")}
            onNavigateProfile={() => setCurrentScreen("profile")}
          />
        )}

        {currentScreen === "sosial" && (
          <SosialScreen
            userName={userProfile.name}
            onNavigateHome={() => setCurrentScreen("home")}
            onNavigateSimulasi={() => setCurrentScreen("practice")}
            onNavigateProfile={() => setCurrentScreen("profile")}
            onJoinRoom={handleJoinRoom}
            onStartLivePresentation={() => setCurrentScreen("live-presentation-setup")}
          />
        )}

        {currentScreen === "live-presentation-setup" && (
          <LivePresentationScreen
            onBack={() => setCurrentScreen("sosial")}
            onEnterLive={handleJoinRoom}
          />
        )}

        {currentScreen === "profile" && (
          <ProfileScreen
            onNavigateHome={() => setCurrentScreen("home")}
            onNavigatePractice={() => setCurrentScreen("practice")}
            onNavigateSosial={() => setCurrentScreen("sosial")}
            onOpenSettings={() => setCurrentScreen("settings")}
            onOpenSessionDetail={handleOpenSessionDetail}
          />
        )}

        {currentScreen === "session-detail" && selectedHistorySession && (
          <SessionDetailScreen
            sessionId={selectedHistorySession.sessionId}
            kategori={selectedHistorySession.kategori}
            date={selectedHistorySession.date}
            isLive={selectedHistorySession.isLive}
            onBack={() => {
              setSelectedHistorySession(null);
              setCurrentScreen("profile");
            }}
          />
        )}

        {currentScreen === "settings" && (
          <SettingsScreen
            onBack={() => setCurrentScreen("profile")}
            onNavigateHome={() => setCurrentScreen("home")}
            onNavigatePractice={() => setCurrentScreen("practice")}
            onNavigateSosial={() => setCurrentScreen("sosial")}
          />
        )}

        {currentScreen === "live-room" && (
          <LiveRoomScreen
            roomData={selectedLiveRoom}
            onLeaveRoom={handleLeaveLiveRoom}
            onSessionEnded={handleSessionEnded}
          />
        )}

        {currentScreen === "live-results" && liveResults && (
          <LiveResultsScreen
            results={liveResults.results}
            sessionId={liveResults.sessionId}
            onDone={() => {
              setLiveResults(null);
              setCurrentScreen("sosial");
            }}
            onViewViewerFeedback={handleViewViewerFeedback}
          />
        )}

        {currentScreen === "viewer-feedback" && (
          <ViewerFeedbackScreen
            sessionId={viewerFeedbackSessionId}
            onBack={() => {
              setLiveResults(null);
              setCurrentScreen("sosial");
            }}
          />
        )}

        {currentScreen === "module-detail" && (
          <ModuleDetailScreen
            moduleData={selectedModule}
            onBack={handleBackToHome}
            onStartLesson={(num) => handleStartLesson(num, selectedModule)}
            onOpenNextModule={(nextNum) => alert(`Membuka Modul ${nextNum}`)}
          />
        )}

        {currentScreen === "lesson" && (
          <LessonScreen
            lessonData={selectedLesson}
            onBack={handleBackToModuleDetail}
            onFinish={handleLessonFinish}
          />
        )}
      </PhoneFrame>
    </UserProgressProvider>
  );
}

export default App;
