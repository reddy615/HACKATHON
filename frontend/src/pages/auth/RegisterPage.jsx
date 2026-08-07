import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TextField, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import AuthFormCard from '../../components/common/AuthFormCard';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await register(form);
      navigate('/');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <AuthFormCard
      title="Create account"
      subtitle="Join CartRescue AI to unlock smarter shopping recovery and tracking."
      onSubmit={handleSubmit}
      submitLabel="Create Account"
    >
      <TextField label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
      <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth required />
      <TextField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth required />
      <Typography variant="body2" color="text.secondary">
        Already have an account? <Link to="/login">Login</Link>
      </Typography>
    </AuthFormCard>
  );
};

export default RegisterPage;
