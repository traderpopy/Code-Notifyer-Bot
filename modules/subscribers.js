import { readFileSync, writeFileSync, existsSync } from 'fs';

const SUBSCRIBERS_FILE = './subscribers.json';

let subscribers = {
    users: [],
    groups: []
};

export function loadSubscribers() {
    try {
        if (existsSync(SUBSCRIBERS_FILE)) {
            const data = readFileSync(SUBSCRIBERS_FILE, 'utf8');
            subscribers = JSON.parse(data);
            console.log(`📋 Loaded ${subscribers.users.length} users, ${subscribers.groups.length} groups`);
        }
    } catch (error) {
        console.warn('⚠️ Failed to load subscribers, starting fresh');
    }
    return subscribers;
}

export function saveSubscribers() {
    try {
        writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ Failed to save subscribers:', error.message);
    }
}

export function addUser(chatId, username = null, firstName = null) {
    const existing = subscribers.users.find(u => u.chatId === chatId);
    if (!existing) {
        subscribers.users.push({
            chatId,
            username,
            firstName,
            joinedAt: new Date().toISOString()
        });
        saveSubscribers();
        console.log(`➕ New user subscribed: ${firstName || username || chatId}`);
        return true;
    }
    return false;
}

export function addGroup(chatId, title = null) {
    const existing = subscribers.groups.find(g => g.chatId === chatId);
    if (!existing) {
        subscribers.groups.push({
            chatId,
            title,
            joinedAt: new Date().toISOString()
        });
        saveSubscribers();
        console.log(`➕ Bot added to group: ${title || chatId}`);
        return true;
    }
    return false;
}

export function removeGroup(chatId) {
    const index = subscribers.groups.findIndex(g => g.chatId === chatId);
    if (index !== -1) {
        const removed = subscribers.groups.splice(index, 1);
        saveSubscribers();
        console.log(`➖ Bot removed from group: ${removed[0].title || chatId}`);
        return true;
    }
    return false;
}

export function getAllChatIds() {
    const userIds = subscribers.users.map(u => u.chatId);
    const groupIds = subscribers.groups.map(g => g.chatId);
    return [...userIds, ...groupIds];
}

export function getStats() {
    return {
        users: subscribers.users.length,
        groups: subscribers.groups.length,
        total: subscribers.users.length + subscribers.groups.length
    };
}
