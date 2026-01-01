const onSubmit = async (data: LoginFormData) => {
  setIsLoading(true);
  try {
    const result = await login(data);

    if (result.success && result.user) {
      setUser(result.user); // store user in context
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Failed to log in');
    }
  } catch (error) {
    toast.error('An unexpected error occurred');
    console.error(error);
  } finally {
    setIsLoading(false);
  }
};
