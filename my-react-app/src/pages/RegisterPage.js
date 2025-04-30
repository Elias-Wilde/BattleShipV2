import React, {useState} from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../utils.js/api";
import "../styles/RegisterPage.css";


function RegisterPage() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();


    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await registerUser(username, email, password, confirmPassword);
            setSuccess(true);
            setError("");
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (err) {
            setError(err.response.data.detail || "Registration failed. Please try again.");
            setSuccess(false);
        }
    }

    return (
        <div className="register-page">
            <h1>Register</h1>
            <form onSubmit={handleRegister}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
                <button type="submit">Register</button>
            </form>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">Registration successful! Redirecting to login...</p>}
            <p className="login-link">Already have an account? <a href="/login">Login</a></p>
        </div>
    );
}

export default RegisterPage;