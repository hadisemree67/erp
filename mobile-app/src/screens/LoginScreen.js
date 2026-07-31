import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login } = useContext(AuthContext);

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Hata', 'Kullanıcı adı ve şifre gereklidir.');
            return;
        }

        setLoading(true);
        const result = await login(username, password);
        setLoading(false);

        if (!result.success) {
            Alert.alert('Giriş Başarısız', result.message);
        }
        // If success, App.js navigation will automatically switch because user state changes.
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Stok ERP Depo</Text>
            
            <TextInput
                style={styles.input}
                placeholder="Kullanıcı Adı"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />
            
            <TextInput
                style={styles.input}
                placeholder="Şifre"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            
            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Giriş Yap</Text>}
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5'
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 40,
        color: '#333'
    },
    input: {
        height: 50,
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ddd'
    },
    button: {
        backgroundColor: '#2563eb',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600'
    }
});
