<template>
	<div class="container">
		<div class="tabbar">
			<button v-for="(_, tab) in tabs" :key="tab" :class="['tab-button', { active: currentTab === tab }]" @click="currentTab = tab">
				{{ tab }}
			</button>
		</div>
		<UsagePane v-if="currentTab === '使い方'" class="tab" />
		<ConverterPane
			v-else
			class="tab"
			:disableDownload="converter.disableDownload"
			:disableJumpToGamePage="converter.disableJumpToGamePage"
			:disableReset="converter.disableReset"
			:disableConvertPlugins="converter.disableConvertPlugins"
			:converterMessage="converter.converterMessage"
			:usePluginConverter="converter.usePluginConverter"
			:progressMessage="converter.progressMessage"
			:showConvertProgress="converter.showConvertProgress"
			:convertProgressRate="converter.convertProgressRate"
			:errorMessage="converter.errorMessage"
			:gamePageUrl="converter.gamePageUrl"
			:gameWidth="converter.gameWidth"
			:gameHeight="converter.gameHeight"
			:isStartedGame="converter.isStartedGame"
			:onDrop="converter.onDrop"
			:download="converter.download"
			:reset="converter.reset"
			:jumpToGamePage="converter.jumpToGamePage"
			:checkUsePluginConverter="converter.checkUsePluginConverter"
		/>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ConverterPane from "@/components/ConverterPane.vue";
import UsagePane from "@/components/UsagePane.vue";
import { useConverter } from "@/composables/useConverter";

const tabs = {
	ホーム: ConverterPane,
	使い方: UsagePane
} as const;
const currentTab = ref("ホーム" as keyof typeof tabs);
const converter = useConverter();
</script>

<style scoped>
.container {
	display: flex;
	flex-flow: column nowrap;
	width: 100vw;
	height: 100vh;
}

.tabbar {
	flex: 0 0 auto;
	-x-background-color: #d1d5db;
	background-color: #e5e7eb;
}

.tab-button {
	color: #888;
	background-color: #e5e7eb;
	font-size: 1.2rem;
	padding: 0.7rem 3rem;
	border-width: 0px;
	border-radius: 0;
	font-weight: bold;

	&:hover {
		background-color: #d1d5db;
	}

	&.active {
		color: #444;
		background-color: white;
	}
}

.tab {
	flex: 1 1 auto;
}
</style>
