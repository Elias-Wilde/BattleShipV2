import React, {useState} from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../utils/api";
import { getErrorMessage } from "../utils/errorHandler";
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
            await registerUser(username, email, password);
            setSuccess(true);
            setError("");
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (err) {
            setError(getErrorMessage(err) || "Registration failed. Please try again.");
            setSuccess(false);
        }
    }

    return (
        <div className="register-page">
            <form className="register-form" onSubmit={handleRegister}>
                <h1>Register</h1>
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
                <button type="submit" className="btn">Register</button>
                <p className="login-link">Already have an account? <a href="/login">Login</a></p>
            </form>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">Registration successful! Redirecting to login...</p>}
        </div>
    );
}

export default RegisterPage;