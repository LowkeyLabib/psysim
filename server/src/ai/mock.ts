import { IAIProvider, ChatMessage } from './provider.js';

export class MockSimulationProvider implements IAIProvider {
  name = 'mock';

  async generateChat(
    messages: ChatMessage[],
    _options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const query = lastUser.toLowerCase().trim();

    // Check language from system prompt or query
    const isBengaliScript = /[\u0980-\u09FF]/.test(lastUser);
    const isBanglish =
      /\b(kemon|achen|koto|din|dhore|ghum|hocche|mon|kharap|bhalo|lage|na|kichu|apnar)\b/i.test(
        lastUser
      );
    const prefersBn = isBengaliScript || isBanglish || systemMessage.includes('Bengali');

    // 1. Anti-Injection / Anti-Diagnosis Leakage
    if (
      query.includes('ignore previous') ||
      query.includes('system prompt') ||
      query.includes('what is your diagnosis') ||
      query.includes('what did the doctor write') ||
      query.includes('diagnosis code') ||
      query.includes('রোগের নাম কি') ||
      query.includes('ডাক্তার কি বলেছে')
    ) {
      if (prefersBn) {
        return 'ডাক্তার সাহেব, আমি তো মেডিকেল বিষয় বা ডায়াগনোসিস বুঝি না। আমি শুধু জানি আমার অনেক কষ্ট হচ্ছে, তাই আপনার কাছে এসেছি সাহায্য চাইতে।';
      }
      return "Doctor, I don't know medical terms or diagnoses. I only know I haven't been feeling well and came to you for help.";
    }

    // 2. Greetings
    if (
      query.startsWith('hi') ||
      query.startsWith('hello') ||
      query.includes('assalamu alaikum') ||
      query.includes('আসসালামু') ||
      query.includes('কেমন আছেন') ||
      query.includes('kemon achen')
    ) {
      if (prefersBn) {
        return 'ওয়ালাইকুম আসসালাম ডাক্তার সাহেব। আসলে শরীর আর মন কোনোটিই ভালো নেই... দিন দিন অবস্থা খারাপের দিকে যাচ্ছে।';
      }
      return "Hello doctor. To be honest, I haven't been doing well at all lately. Everything feels overwhelming.";
    }

    // 3. Sleep / Insomnia
    if (
      query.includes('sleep') ||
      query.includes('insomnia') ||
      query.includes('wake') ||
      query.includes('ঘুম') ||
      query.includes('ghum') ||
      query.includes('raat')
    ) {
      if (prefersBn) {
        return 'ঘুম একদমই হয় না ডাক্তার সাহেব। বিছানায় শুয়ে থাকলেও এপাশ-ওপাশ করি। আর রাত ৩টা বা ৪টার দিকে ঘুম ভেঙে যায়, এরপর আর কিছুতেই ঘুমাতে পারি না।';
      }
      return 'My sleep has been terrible. I struggle to fall asleep, and even when I do, I wake up around 3 or 4 in the morning and cannot get back to sleep.';
    }

    // 4. Mood / Depressive Feelings / Anhedonia
    if (
      query.includes('mood') ||
      query.includes('sad') ||
      query.includes('cry') ||
      query.includes('interest') ||
      query.includes('enjoy') ||
      query.includes('mon') ||
      query.includes('মন') ||
      query.includes('খারাপ') ||
      query.includes('ভালো লাগে না') ||
      query.includes('bhalo lage na')
    ) {
      if (prefersBn) {
        return 'সারাদিন বুকের ভেতর কেমন যেন একটা ভারী ভাব লেগে থাকে। আগে যে কাজগুলো করতে আনন্দ পেতাম, গান শুনতাম বা বন্ধুদের সাথে আড্ডা দিতাম—এখন কোনো কিছুতেই কোনো আনন্দ পাই না।';
      }
      return 'I feel this persistent heaviness in my chest all day. Activities I used to enjoy, like listening to music or seeing friends, bring me no joy anymore.';
    }

    // 5. Timeline / Onset / Duration
    if (
      query.includes('how long') ||
      query.includes('when did') ||
      query.includes('duration') ||
      query.includes('since when') ||
      query.includes('koto din') ||
      query.includes('কতদিন') ||
      query.includes('কবে থেকে') ||
      query.includes('shuru')
    ) {
      if (prefersBn) {
        return 'প্রায় দুই মাস ধরে এমন হচ্ছে। শুরুতে ভেবেছিলাম কাজের চাপের কারণে হয়তো ক্লান্ত, কিন্তু দিন দিন এটা আরো বেড়েই চলেছে।';
      }
      return 'It has been going on for about two months now. At first I thought it was just work fatigue, but it keeps worsening rather than getting better.';
    }

    // 6. Work / Functional Impairment
    if (
      query.includes('work') ||
      query.includes('job') ||
      query.includes('office') ||
      query.includes('study') ||
      query.includes('focus') ||
      query.includes('concentrat') ||
      query.includes('কাজ') ||
      query.includes('kaj') ||
      query.includes('অফিস')
    ) {
      if (prefersBn) {
        return 'অফিসের কাজে একদম মন বসাতে পারি না। ছোটখাটো ফাইলের হিসেব মেলাতেও অনেক ভুল হচ্ছে। বসের কাছে অলরেডি দুইবার বকা খেয়েছি। মনে হয় আমার দ্বারা আর কিছুই হবে না।';
      }
      return 'I can barely concentrate at work. I make simple mistakes on reports and my supervisor has already warned me twice. I feel like I am failing at everything.';
    }

    // 7. Past History / Medications / Substances
    if (
      query.includes('past') ||
      query.includes('history') ||
      query.includes('medicine') ||
      query.includes('medication') ||
      query.includes('drug') ||
      query.includes('alcohol') ||
      query.includes('smoke') ||
      query.includes('ঔষধ') ||
      query.includes('oshoodh') ||
      query.includes('নেশা') ||
      query.includes('nesha') ||
      query.includes('আগে') ||
      query.includes('ager')
    ) {
      if (prefersBn) {
        return 'আগে কখনো এমন মানসিক সমস্যা হয়নি ডাক্তার সাহেব। কোনো নিয়মিত বড় অসুখ বা প্রেসার-ডায়াবেটিস নেই। কোনো ড্রাগ বা অ্যালকোহল খাই না, শুধু মাঝে মাঝে দিনে দু-একটা সিগারেট খাই।';
      }
      return 'I have never had any mental health issues in the past. No chronic medical illnesses, and I do not take regular medicines. I do not drink alcohol or use substances, just occasional cigarettes.';
    }

    // 8. Risk Assessment / Suicidality / Self-Harm
    if (
      query.includes('suicid') ||
      query.includes('end your life') ||
      query.includes('harm') ||
      query.includes('die') ||
      query.includes('death') ||
      query.includes('মরার') ||
      query.includes('morar') ||
      query.includes('আত্মহত্যা') ||
      query.includes('মরে যেতে') ||
      query.includes('বেঁচে') ||
      query.includes('beche')
    ) {
      if (prefersBn) {
        return 'মাঝে মাঝে খুব হতাশ লাগলে মনে হয় এই যন্ত্রণার চেয়ে মরে যাওয়াও ভালো ছিল। কিন্তু নিজে কোনো ক্ষতি করার চেষ্টা করিনি বা কোনো প্ল্যান করিনি। পরিবারের কথা ভেবে নিজেকে সামলে রাখি।';
      }
      return 'Sometimes when the despair gets intense, I think that not waking up would be a relief. But I have never tried to harm myself and have no plan to do so. Thinking about my family keeps me grounded.';
    }

    // Default conversational response
    if (prefersBn) {
      return 'জি ডাক্তার সাহেব, আপনি ঠিকই বলেছেন। এই পরিস্থিতি আমাকে খুব অসহায় করে তুলেছে। আপনি কি মনে করেন আমি সুস্থ হতে পারব?';
    }
    return "Yes doctor, you're right. This situation has made me feel very helpless. Do you think I will be able to get better?";
  }

  async generateStructured<T>(_prompt: string, _systemInstruction?: string): Promise<T> {
    // Returns realistic structured data for test scenarios
    return {
      status: 'COMPLETED',
      confidence: 0.9,
      evidenceQuote: 'Verified from conversation transcript',
    } as unknown as T;
  }
}
