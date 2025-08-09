import { handleNavigationError } from '../utils/navigationErrorHandler';

export const Navigation = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [navigationError, setNavigationError] = useState(null);

  useEffect(() => {
    const unsubscribe = supabase.auth.onAuthStateChange((event, session) => {
      try {
        setIsAuthenticated(!!session);
      } catch (error) {
        handleNavigationError(error);
      }
    });

    return () => unsubscribe();
  }, []);

  if (navigationError) {
    return <NavigationErrorScreen error={navigationError} />;
  }

  return (
    <Stack.Navigator
      screenListeners={{
        error: (e) => {
          handleNavigationError(e.data.error);
        }
      }}
    >
      {/* Navigation stacks */}
    </Stack.Navigator>
  );
};