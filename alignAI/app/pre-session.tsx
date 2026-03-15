import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { STRETCHES, BodyArea } from '../data/stretches'; // adjust path if needed

export default function PreSession() {
  const router = useRouter();

  const [neck, setNeck] = useState(0);
  const [shoulders, setShoulders] = useState(0);
  const [lowerBack, setLowerBack] = useState(0);

  const startSession = () => {
    const areas: { key: BodyArea; score: number }[] = [
      { key: 'neck', score: neck },
      { key: 'shoulders', score: shoulders },
      { key: 'lowerBack', score: lowerBack },
    ];

    areas.sort((a, b) => b.score - a.score);
    const top = areas[0];
    const focusArea: BodyArea = top && top.score > 0 ? top.key : 'neck';

    const sessionStretches = STRETCHES.filter(
      (s) => s.area === focusArea
    ).slice(0, 2); // up to 2 stretches for this area

    router.replace({
      pathname: '/instructions',
      params: {
        stretchIds: JSON.stringify(sessionStretches.map((s) => s.id)),
        index: '0',
      },
    });
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where do you feel discomfort?</Text>
      <Text style={styles.subtitle}>0 = none, 10 = worst possible pain</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Neck: {neck}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={neck}
          onValueChange={setNeck}
          minimumTrackTintColor="#4CAF50"
          maximumTrackTintColor="#555"
          thumbTintColor="#4CAF50"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Shoulders: {shoulders}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={shoulders}
          onValueChange={setShoulders}
          minimumTrackTintColor="#4CAF50"
          maximumTrackTintColor="#555"
          thumbTintColor="#4CAF50"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Lower back: {lowerBack}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={lowerBack}
          onValueChange={setLowerBack}
          minimumTrackTintColor="#4CAF50"
          maximumTrackTintColor="#555"
          thumbTintColor="#4CAF50"
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={startSession}>
        <Text style={styles.buttonText}>Start Stretch Session</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    marginBottom: 4,
  },
  slider: {
    width: '100%',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
