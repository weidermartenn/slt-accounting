let tempIdCounter = -1;

export function createTempId() {
    return tempIdCounter--;
}