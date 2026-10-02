// JWT Token Management
export const getToken = () => localStorage.getItem('buzzer_token');
export const setToken = (token) => localStorage.setItem('buzzer_token', token);
export const removeToken = () => localStorage.removeItem('buzzer_token');

export const getUser = () => {
  const token = getToken();
  if (!token) return null;
  try {
    // Decode JWT payload (not verifying, just reading)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
};

export const getUserRole = () => {
  const user = getUser();
  return user?.role || null;
};

export const isLoggedIn = () => !!getToken();
