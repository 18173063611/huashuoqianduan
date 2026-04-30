import { request } from './request'
import type { GenerateTtsRequest, GenerateTtsResponse } from '../types/voiceTypes'

/** TTS 生成。 */
export function generateTts(payload: GenerateTtsRequest) {
  return request<GenerateTtsResponse>('/voices/tts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
