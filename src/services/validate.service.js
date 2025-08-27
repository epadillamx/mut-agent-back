import { invokeClaude } from '../services/claude.service.js';
import { PROMPT_TEMPLATES } from '../plantillas/prompts.js';

export async function processLocationSelection(message, availableLocations) {

    try {
        const USER = PROMPT_TEMPLATES.processLocationsselecction.user
            .replaceAll('{message}', message)
            .replaceAll('{availableLocations}', JSON.stringify(availableLocations));
        const response = await invokeClaude(USER, PROMPT_TEMPLATES.processLocationsselecction.system);
        return JSON.parse(response);
    } catch (error) {
        return null;
    }
}