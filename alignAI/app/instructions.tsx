import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { STRETCHES, Stretch } from '../data/stretches';

export default function InstructionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    stretchIds?: string;
    index?: string;
  }>();

  const stretchIds: string[] = params.stretchIds
    ? JSON.parse(String(params.stretchIds))
    : [];

  const index = params.index ? Number(params.index) : 0;
  const currentStretchId = stretchIds[index];

  const stretch: Stretch | undefined = STRETCHES.find(
    (s) => s.id === currentStretchId
  );

  if (!stretch) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Could not find this stretch.</Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={styles.linkText}>Go back home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startWithCamera = () => {
    router.replace({
      pathname: '/camera',
      params: {
        stretchId: stretch.id,
        stretchIds: JSON.stringify(stretchIds),
        index: String(index),
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Up next</Text>
      <Text style={styles.title}>{stretch.name}</Text>
      <Text style={styles.subtitle}>{stretch.shortDescription}</Text>

      <View style={styles.middle}>
        <ScrollView style={styles.cuesContainer}>
          {stretch.cues.map((cue, i) => (
            <View key={i} style={styles.cueRow}>
              <Text style={styles.bullet}>{'\u2022'}</Text>
              <Text style={styles.cueText}>{cue}</Text>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.button} onPress={startWithCamera}>
          <Text style={styles.buttonText}>Start with camera</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={styles.secondaryLink}>Skip for now</Text>
        </TouchableOpacity>
      </View> 
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
    middle: {
    flex: 1,
    justifyContent: 'flex-start', // buttons sit under the cues, not at very bottom
    marginTop: 12,
    },
    cuesContainer: {
    maxHeight: 220,    // limit height so buttons stay visible higher up
    marginBottom: 16,
    },
    
  sectionLabel: {
    color: '#4CAF50',
    fontSize: 13,
    marginBottom: 4,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 20,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    color: '#fff',
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  cueText: {
    color: '#fff',
    flex: 1,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryLink: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  linkText: {
    color: '#4CAF50',
    fontSize: 14,
  },
});
