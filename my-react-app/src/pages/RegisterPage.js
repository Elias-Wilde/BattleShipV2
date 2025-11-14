import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../utils/api";
import { getErrorMessage } from "../utils/errorHandler";
import { isAuthenticated } from "../utils/auth";
import { getCSRFToken, initializeCSRFToken } from "../utils/csrf";
import "../styles/RegisterPage.css";


function RegisterPage() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [passwordStrength, setPasswordStrength] = useState("");
    const [csrfReady, setCSRFReady] = useState(false);
    const navigate = useNavigate();


    useEffect(() => {
        const ensureCSRFToken = async () => {
            const token = getCSRFToken();
            if (token) {
                console.log('CSRF token already available');
                setCSRFReady(true);
            } else {
                console.log('Initializing CSRF token for registration...');
                const result = await initializeCSRFToken();
                if (result) {
                    console.log('CSRF token initialized successfully');
                    setCSRFReady(true);
                } else {
                    console.warn('Failed to initialize CSRF token, attempting registration may fail');
                    // Still allow registration attempt, but warn user
                    setCSRFReady(true);
                }
            }
        };
        ensureCSRFToken();
    }, []);

    useEffect(() => {
        if (isAuthenticated()) {
            navigate('/profile');
        }
    }, [navigate]);

    // password strength counter
    const assessPasswordStrength = (pwd) => {
        if (!pwd) return "";

        let strength = 0;
        const checks = {
            length: pwd.length >= 8,
            uppercase: /[A-Z]/.test(pwd),
            lowercase: /[a-z]/.test(pwd),
            numbers: /[0-9]/.test(pwd),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
        };

        Object.values(checks).forEach((check) => {
            if (check) strength++;
        });

        if (strength < 2) return "weak";
        if (strength < 5) return "better";
        return "strong";
    };

    // validate input and feedback
    const validateInput = () => {
        const errors = {};

        // Username validation
        if (!username) {
            errors.username = "Username is required";
        } else if (username.length < 3 || username.length > 50) {
            errors.username = "Username must be between 3 and 50 characters";
        } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            errors.username = "Username can only contain letters, numbers, underscores, and hyphens";
        }

        // Email validation
        if (!email) {
            errors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = "Please enter a valid email address";
        }

        // Password validation
        if (!password) {
            errors.password = "Password is required";
        } else if (password.length < 8) {
            errors.password = "Password must be at least 8 characters long";
        } else if (password.length > 500) {
            errors.password = "Password is too long";
        }

        // Confirm password validation
        if (!confirmPassword) {
            errors.confirmPassword = "Please confirm your password";
        } else if (password !== confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };


    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        if (!validateInput()) {
            return;
        }

        if (!getCSRFToken()) {
            setError("Security token not initialized. Please refresh the page and try again.");
            return;
        }

        setIsLoading(true);

        try {
            // sent request to register user
            await registerUser(username, email, password);
            setSuccess(true);
            setError("");

            // redirect to login after success
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (err) {
            setIsLoading(false);
            const errorMsg = getErrorMessage(err);

            // Security: Handle rate limiting feedback
            if (err.response?.status === 429) {
                setError("Too many registration attempts. Please try again later.");
            }
            // Security: Handle duplicate username/email
            else if (err.response?.status === 409) {
                setError("Username or email already exists. Please try logging in or use a different email.");
            } else {
                setError(errorMsg || "Registration failed. Please try again.");
            }
            setSuccess(false);
        }
    };

    return (
        <div className="register-page">
            <form className="register-form" onSubmit={handleRegister}>
                <h1>Register</h1>

                <div className="form-group">
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => {
                            setUsername(e.target.value);
                            if (validationErrors.username) {
                                setValidationErrors({ ...validationErrors, username: "" });
                            }
                        }}
                        disabled={isLoading}
                        autoComplete="username"
                        required
                    />
                    {validationErrors.username && (
                        <span className="validation-error">{validationErrors.username}</span>
                    )}
                </div>

                <div className="form-group">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (validationErrors.email) {
                                setValidationErrors({ ...validationErrors, email: "" });
                            }
                        }}
                        disabled={isLoading}
                        autoComplete="email"
                        required
                    />
                    {validationErrors.email && (
                        <span className="validation-error">{validationErrors.email}</span>
                    )}
                </div>

                <div className="form-group">
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setPasswordStrength(assessPasswordStrength(e.target.value));
                            if (validationErrors.password) {
                                setValidationErrors({ ...validationErrors, password: "" });
                            }
                        }}
                        disabled={isLoading}
                        autoComplete="new-password"
                        required
                    />
                    {validationErrors.password && (
                        <span className="validation-error">{validationErrors.password}</span>
                    )}
                    {password && (
                        <span className={`password-strength ${passwordStrength}`}>
                            Strength: {passwordStrength}
                        </span>
                    )}
                    <p className="password-hint">
                        Password should be at least 8 characters and contain a mix of uppercase, lowercase, numbers, and symbols.
                    </p>
                </div>

                <div className="form-group">
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (validationErrors.confirmPassword) {
                                setValidationErrors({ ...validationErrors, confirmPassword: "" });
                            }
                        }}
                        disabled={isLoading}
                        autoComplete="new-password"
                        required
                    />
                    {validationErrors.confirmPassword && (
                        <span className="validation-error">{validationErrors.confirmPassword}</span>
                    )}
                </div>

                <button type="submit" className="btn" disabled={isLoading || !csrfReady}>
                    {isLoading ? "Registering..." : !csrfReady ? "Loading..." : "Register"}
                </button>

                <p className="login-link">
                    Already have an account? <a href="/login">Login</a>
                </p>
            </form>

            {success && (
                <div className="success-container">
                    <p className="success">
                        Registration successful! Redirecting to login...
                    </p>
                </div>
            )}

            {error && (
                <div className="error-container">
                    <p className="error">{error}</p>
                </div>
            )}
        </div>
    );
}

export default RegisterPage;