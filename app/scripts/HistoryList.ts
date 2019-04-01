export class HistoryList {
    private items: number[] = [];
    private lastItems: number[] = [];

    get first() {
        return this.items.length > 0 ? this.items[0] : undefined;
    }

    get second() {
        return this.items.length > 1 ? this.items[1] : undefined;
    }

    public add(id: number) {
        this.copyState();
        this.remove(id);
        this.items.unshift(id);
    }

    public remove(id: number) {
        let index = this.items.indexOf(id);
        if (index >= 0) {
            this.items.splice(index, 1);
        }
    }

    public rewind() {
        this.items = this.lastItems;
        this.copyState();
    }

    public toString() {
        return this.items.join(', ');
    }

    private copyState() {
        this.lastItems = this.items.slice();
    }
}
