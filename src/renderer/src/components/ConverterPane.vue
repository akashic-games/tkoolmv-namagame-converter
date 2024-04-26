<template>
  <div class="converter">
    <div class="options">
      <div class="error-message">{{ errorMessage }}</div>
      <p>
        <input
          v-bind:disabled="disableConvertPlugins"
          :value="usePluginConverter"
          type="checkbox"
        />RPGツクールMVプラグインを含めて変換する(試験中)
      </p>
    </div>
    <div class="dropzone" @drop="onDrop" @dragover.prevent>
      <div v-if="isStartedGame()">
        <iframe :src="gamePageUrl" :width="gameWidth" :height="gameHeight"></iframe>
      </div>
      <div v-else>
        <p>{{ converterMessage }}</p>
        <div>{{ progressMessage }}</div>
        <progress
          v-show="showConvertProgress"
          :value="convertProgressRate"
          style="height: 3rem"
        ></progress>
      </div>
    </div>

    <div class="buttons">
      <button @click="download" v-bind:disabled="disableDownload" class="primary">
        ダウンロード
      </button>
      <button @click="jumpToGamePage" v-bind:disabled="disableJumpToGamePage">ゲームページ</button>
      <button @click="reset" v-bind:disabled="disableReset">リセット</button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
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
defineProps<Props>()
</script>

<style scoped>
.converter {
  display: flex;
  flex-flow: column nowrap;
  & > .options {
    padding: 0 1rem;
    & > .error-message {
      color: #f00;
    }
  }
  & > .dropzone {
    flex: 1 1 auto;
    margin: 1rem 1rem 0 1rem;
    border: 1px dashed silver;

    display: flex;
    flex-flow: column nowrap;
    justify-content: center;
    align-items: center;
    font-size: 1.5rem;
    color: #aaa;
    width: auto;
  }

  & > .buttons {
    flex: 0 0 auto;

    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;

    padding: 0.7rem 1rem;

    & > button {
      padding: 0.5rem 2rem;
      border-width: 0;
      border-radius: 4px;
      background-color: #d1d5db;
      font-size: 1rem;

      &:disabled {
        background-color: #e5e7eb;
        color: gray;
      }

      &.primary {
        color: white;
        background-color: #dc2626;
        font-weight: bold;

        &:disabled {
          background-color: #fecaca;
        }

        &:not(disabled):hover {
          background-color: #f87171;
        }
      }
    }
  }
}
</style>
