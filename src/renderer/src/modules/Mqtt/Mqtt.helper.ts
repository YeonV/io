export function mqttTopicMatch(topic: string, pattern: string): boolean {
  if (pattern === '#') {
    // '#' wildcard matches everything, except for topics starting with '$' (system topics)
    return !topic.startsWith('$')
  }
  if (pattern === topic) {
    return true
  }
  // Simple '+' wildcard replacement (doesn't handle # within pattern well, but ok for basic cases)
  // A proper MQTT topic matching library would be more robust for complex patterns.
  const patternSegments = pattern.split('/')
  const topicSegments = topic.split('/')

  if (patternSegments.length > topicSegments.length) {
    return false // Pattern is more specific than topic
  }
  // If pattern ends with /# it matches any sub-levels
  if (patternSegments[patternSegments.length - 1] === '#') {
    if (patternSegments.length - 1 > topicSegments.length) return false // e.g. a/b/# vs a
    for (let i = 0; i < patternSegments.length - 1; i++) {
      if (patternSegments[i] !== '+' && patternSegments[i] !== topicSegments[i]) {
        return false
      }
    }
    return true
  }

  // If lengths are different and no # at the end, no match
  if (patternSegments.length !== topicSegments.length) {
    return false
  }

  for (let i = 0; i < patternSegments.length; i++) {
    if (patternSegments[i] === '+') {
      continue // '+' matches any single level
    }
    if (patternSegments[i] !== topicSegments[i]) {
      return false
    }
  }
  return true
}
