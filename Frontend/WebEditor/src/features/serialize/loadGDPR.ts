import { Command, CommandExecutionContext, ILogger, NullLogger, SModelRootImpl, TYPES } from "sprotty";
import { Action } from "sprotty-protocol";
import { sendMessage } from "./webSocketHandler";
import { setModelFileName } from "../../index";
import { setFileNameInPageTitle } from "./load";
import { inject, optional } from "inversify";
import { LoadingIndicator } from "../../common/loadingIndicator";

export interface LoadGDPRAction extends Action {
    kind: typeof LoadGDPRAction.KIND;
    file: File | undefined;
}
export namespace LoadGDPRAction {
    export const KIND = "load-gdpr";

    export function create(file?: File): LoadGDPRAction {
        return {
            kind: KIND,
            file,
        };
    }
}

export class LoadGDPRCommand extends Command {
    static readonly KIND = LoadGDPRAction.KIND;

    @inject(TYPES.ILogger)
    private readonly logger: ILogger = new NullLogger();
    @inject(LoadingIndicator)
    @optional()
    protected loadingIndicator?: LoadingIndicator;

    constructor() {
        super();
    }

    /**
     * Gets the GDPR model file from the action or opens a file picker dialog if no file is provided.
     * @returns A promise that resolves to the model file.
     */
    private getModelFiles(): Promise<File[] | undefined> {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".gdpr";
        input.multiple = false;

        const fileLoadPromise = new Promise<File[] | undefined>((resolve, reject) => {
            input.onchange = () => {
                if (input.files && input.files.length === 1) {
                    const file = input.files[0];
                    if (file.name.endsWith(".gdpr")) {
                        resolve([file]);
                    } else {
                        reject("Please select a file with the .gdpr extension.");
                    }
                } else {
                    reject("You must select exactly one .gdpr file.");
                }
            };
        });

        input.click();
        return fileLoadPromise;
    }

    async execute(context: CommandExecutionContext): Promise<SModelRootImpl> {
        this.loadingIndicator?.showIndicator("Loading GDPR model file...");
        try {
            const [gdprFile] = (await this.getModelFiles()) ?? [];

            if (!gdprFile) {
                throw new Error("No file selected.");
            }

            // Read the content of the GDPR file
            const gdprFileContent = await this.readFileContent(gdprFile);

            // Send the file content (you will handle this part)
            sendMessage("GDPR:" + this.getFileNameWithoutExtension(gdprFile) + ":" + gdprFileContent);

            setModelFileName(gdprFile.name.substring(0, gdprFile.name.lastIndexOf(".")));
            setFileNameInPageTitle(gdprFile.name);
            return context.root;
        } catch (error) {
            this.logger.error(this, (error as Error).message);
            this.loadingIndicator?.hideIndicator();
            return context.root;
        }
    }

    undo(context: CommandExecutionContext): SModelRootImpl {
        return context.root;
    }

    redo(context: CommandExecutionContext): SModelRootImpl {
        return context.root;
    }

    /**
     * Utility function to read the content of a file as a string.
     * @param file The file to read.
     * @returns A promise that resolves to the file content as a string.
     */
    private readFileContent(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    getFileNameWithoutExtension(file: File): string {
        const fileName = file.name;
        return fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
    }
}
