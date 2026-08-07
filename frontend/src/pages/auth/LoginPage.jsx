import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { TextField, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import AuthFormCard from '../../components/common/AuthFormCard';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await login(form);
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <AuthFormCard
      title="Welcome back"
      subtitle="Sign in to continue shopping and manage your cart."
      onSubmit={handleSubmit}
      submitLabel="Sign In"
    >
      <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth required />
      <TextField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth required />
      <Typography variant="body2" color="text.secondary">
        Don&apos;t have an account? <Link to="/register">Create one</Link>
      </Typography>
    </AuthFormCard>
  );
};

export default LoginPage;
