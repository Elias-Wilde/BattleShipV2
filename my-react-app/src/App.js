import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import UserProfile from './pages/UserProfile';
import GamePage from './pages/GamePage';
import LoginPage from './pages/LoginPage';
import CreateGamePage from './pages/CreateGamePage';
import BrowseGamesPage from './pages/BrowseGamesPage';
import RegisterPage from './pages/RegisterPage';
import ImpressumPage from './pages/ImpressumPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/create-game" element={<CreateGamePage />} />
          <Route path="/browse-games" element={<BrowseGamesPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/impressum" element={<ImpressumPage />} />
        </Routes>
        <Footer />
        <ToastContainer position='top-right' autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      </div>
    </Router>
  );
}

export default App;
