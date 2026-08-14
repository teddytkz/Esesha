export namespace main {
	
	export class PrivateKeyFileResult {
	    path: string;
	    encryptedContent: number[];
	
	    static createFrom(source: any = {}) {
	        return new PrivateKeyFileResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.encryptedContent = source["encryptedContent"];
	    }
	}

}

export namespace models {
	
	export class Connection {
	    id: number;
	    name: string;
	    host: string;
	    port: number;
	    username: string;
	    encrypted_password: number[];
	    privateKeyPath: string;
	    encrypted_private_key: number[];
	    createdAt: number;
	    updatedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new Connection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.username = source["username"];
	        this.encrypted_password = source["encrypted_password"];
	        this.privateKeyPath = source["privateKeyPath"];
	        this.encrypted_private_key = source["encrypted_private_key"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}

}

export namespace sftp {
	
	export class FileInfo {
	    name: string;
	    size: number;
	    mode: number;
	    modifiedTime: number;
	    isDir: boolean;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new FileInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.size = source["size"];
	        this.mode = source["mode"];
	        this.modifiedTime = source["modifiedTime"];
	        this.isDir = source["isDir"];
	        this.path = source["path"];
	    }
	}

}

