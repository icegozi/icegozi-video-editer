import { describe, it, expect } from 'vitest';
import start from '../../src/infrastructure/codex/protocol/ThreadStartParams.json';
import resume from '../../src/infrastructure/codex/protocol/ThreadResumeParams.json';
import call from '../../src/infrastructure/codex/protocol/DynamicToolCallParams.json';
import output from '../../src/infrastructure/codex/protocol/DynamicToolCallResponse.json';
import { videoTools } from '../../src/application/assistant/assistantService';

describe('Pinned runtime contracts', () => {
  it('supports namespace tools and an explicit empty environment list', () => {
    expect(start.properties).toHaveProperty('dynamicTools');
    expect(start.properties).toHaveProperty('environments');
    const namespace = start.definitions.DynamicToolSpec.oneOf.find((s) => s.title === 'NamespaceDynamicToolSpec')!;
    for (const property of namespace.required) expect(videoTools[0]).toHaveProperty(property);
    const functionTool = start.definitions.DynamicToolNamespaceTool.oneOf[0];
    for (const tool of videoTools[0].tools) {
      for (const property of functionTool.required) expect(tool).toHaveProperty(property);
      expect(tool.type).toBe('function');
    }
  });
  it('does not send dynamicTools during resume and correlates root server tool calls', () => {
    expect(resume.properties).not.toHaveProperty('dynamicTools');
    expect(call.required).toEqual(expect.arrayContaining(['threadId', 'turnId', 'callId', 'tool', 'arguments']));
    expect(output.required).toEqual(expect.arrayContaining(['contentItems', 'success']));
  });
});
