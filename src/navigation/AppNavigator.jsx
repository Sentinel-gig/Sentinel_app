import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import useAppStore from "../store/useAppStore";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import DashboardScreen from "../screens/DashboardScreen";
import RouteMapScreen from "../screens/RouteMapScreen";
import ReportScreen from "../screens/ReportScreen";
import ActivityScreen from "../screens/ActivityScreen";
import MoreScreen from "../screens/MoreScreen";
import SettingsScreen from "../screens/SettingsScreen";
import SurveyScreen from "../screens/SurveyScreen";
import FeedbackScreen from "../screens/Feedbackscreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Routes" component={RouteMapScreen} />
      <Tab.Screen name="Report" component={ReportScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Survey" component={SurveyScreen} />
          <Stack.Screen name="Feedback" component={FeedbackScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
