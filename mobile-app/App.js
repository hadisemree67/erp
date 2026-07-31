import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, AuthContext } from './src/context/AuthContext';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import PickingScreen from './src/screens/PickingScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import StatsScreen from './src/screens/StatsScreen';
import PendingOrdersScreen from './src/screens/PendingOrdersScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
    const { user, isLoading } = useContext(AuthContext);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user == null ? (
                // No token found, user isn't signed in
                <Stack.Screen name="Login" component={LoginScreen} />
            ) : (
                // User is signed in
                <>
                    <Stack.Screen name="Home" component={HomeScreen} />
                    <Stack.Screen 
                        name="Picking" 
                        component={PickingScreen} 
                        options={{ headerShown: true, title: 'Sipariş Toplama' }}
                    />
                    <Stack.Screen 
                        name="Summary" 
                        component={SummaryScreen} 
                    />
                    <Stack.Screen 
                        name="Stats" 
                        component={StatsScreen} 
                        options={{ headerShown: true, title: 'Günlük İstatistikler' }}
                    />
                    <Stack.Screen 
                        name="PendingOrders" 
                        component={PendingOrdersScreen} 
                        options={{ headerShown: false }}
                    />
                </>
            )}
        </Stack.Navigator>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <NavigationContainer>
                <AppNavigator />
            </NavigationContainer>
        </AuthProvider>
    );
}
