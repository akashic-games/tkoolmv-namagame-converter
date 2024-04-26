import { generateNamagameAudioAssets } from '@/utils/generateNamagameAudioAssets'
import { reactive, type InjectionKey } from 'vue'

export const useConverterKey: InjectionKey<UseConverterrStore> = Symbol('useConverter')

const DEFAULT_CONVERTER_MESSAGE =
  'ここに ツクールMVゲームの配布用ファイルをドラッグ＆ドロップしてください。'

interface State {
  gameZip: any | null
  speedPerSec: number
  isConverting: boolean
  gameDistDirPath: string
  disableDownload: boolean
  disableJumpToGamePage: boolean
  disableReset: boolean
  disableConvertPlugins: boolean
  converterMessage: string
  usePluginConverter: boolean
  progressMessage: string
  showConvertProgress: boolean
  convertProgressRate: number
  errorMessage: string
  gamePageUrl: string
  gameWidth: number
  gameHeight: number
  isStartedGame: () => boolean
  onDrop: (payload: DragEvent) => Promise<void>
  download: () => void
  reset: () => void
  jumpToGamePage: () => void
}

export function useConverter() {
  function initialize(): void {
    state.gameZip = null
    state.gamePageUrl = ''
    state.gameDistDirPath = ''
    state.disableDownload = true
    state.disableJumpToGamePage = true
    state.disableReset = true
    state.disableConvertPlugins = false
    state.converterMessage = DEFAULT_CONVERTER_MESSAGE
    state.usePluginConverter = false
    state.progressMessage = ''
    state.showConvertProgress = false
    state.convertProgressRate = 0
    state.errorMessage = ''
    state.gamePageUrl = ''
    state.gameWidth = 0
    state.gameHeight = 0
  }

  const isStartedGame = (): boolean => {
    return state.gamePageUrl !== ''
  }

  const onDrop = async (payload: DragEvent): Promise<void> => {
    let timerId: number | null = null
    try {
      payload.preventDefault()
      if (
        state.isConverting ||
        state.gameZip ||
        !payload.dataTransfer?.files?.length ||
        !payload.dataTransfer?.items?.length
      )
        return
      state.isConverting = true
      state.converterMessage = 'ニコ生ゲーム生成中です。少々お待ちください。'
      state.disableConvertPlugins = true
      state.errorMessage = ''
      const gameSrcDirPath = (payload.dataTransfer.files[0] as any).path
      const dirSize = await (window as any).tkoolmvApi.getAssetsSize(gameSrcDirPath)
      const startTime = Date.now()
      const estTime = Math.round(dirSize / state.speedPerSec)
      state.showConvertProgress = true
      let currentTime = 0
      timerId = window.setInterval(() => {
        state.convertProgressRate += 1 / estTime
        if (state.convertProgressRate > 1) {
          state.convertProgressRate = 1
        }
        currentTime++
        state.progressMessage = `残り${currentTime < estTime ? estTime - currentTime : 0}秒(予想)`
      }, 1000)
      state.gameDistDirPath = await (window as any).tkoolmvApi.generateNamaGameDir(
        gameSrcDirPath,
        state.usePluginConverter
      )
      await generateNamagameAudioAssets(
        gameSrcDirPath,
        state.gameDistDirPath,
        'http://localhost:3333/ffmpeg'
      ) // TODO: urlはAPI経由で取得するように
      const response = await (window as any).tkoolmvApi.generateNamaGameData(state.gameDistDirPath)
      state.gameWidth = Math.round(response.gameJson.width * 1.2)
      state.gameHeight = Math.round(response.gameJson.height * 1.2)
      state.showConvertProgress = true
      const endTime = Date.now()
      state.gameZip = response.buffer
      state.gamePageUrl = response.gameContentUrl
      state.disableDownload = false
      state.disableReset = false
      state.disableJumpToGamePage = false
      state.speedPerSec = Math.round(dirSize / ((endTime - startTime) / 1000)) // 変換スピード更新
    } catch (e: any) {
      state.errorMessage = `ゲーム変換時に次のエラーが発生：${e.message}`
    } finally {
      state.disableConvertPlugins = false
      state.isConverting = false
      if (timerId) {
        window.clearInterval(timerId)
        timerId = null
      }
    }
  }

  const download = (): void => {
    if (!state.gameZip) {
      return
    }
    const blob = new Blob([state.gameZip], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.target = '_blank'
    anchor.download = 'game.zip'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const reset = (): void => {
    if (!state.gameZip) {
      return
    }
    initialize()
  }

  const jumpToGamePage = (): void => {
    if (state.gamePageUrl) {
      window.open(state.gamePageUrl, '_blank')
    }
  }

  const state = reactive<State>({
    gameZip: null,
    speedPerSec: 1000000,
    isConverting: false,
    gameDistDirPath: '',
    disableDownload: true,
    disableJumpToGamePage: true,
    disableReset: true,
    disableConvertPlugins: false,
    converterMessage: DEFAULT_CONVERTER_MESSAGE,
    usePluginConverter: false,
    progressMessage: '',
    showConvertProgress: false,
    convertProgressRate: 0,
    errorMessage: '',
    gamePageUrl: '',
    gameWidth: 0,
    gameHeight: 0,
    isStartedGame,
    onDrop,
    download,
    reset,
    jumpToGamePage
  })

  return state
}

export type UseConverterrStore = ReturnType<typeof useConverter>
