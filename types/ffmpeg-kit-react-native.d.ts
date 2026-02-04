// Type declarations for ffmpeg-kit-react-native
declare module "ffmpeg-kit-react-native" {
    export interface Session {
        getReturnCode(): Promise<ReturnCodeType>;
        getOutput(): Promise<string>;
        getDuration(): Promise<number>;
        getState(): Promise<string>;
    }

    export interface ReturnCodeType {
        getValue(): number;
    }

    export const FFmpegKit: {
        execute(command: string): Promise<Session>;
        executeAsync(command: string): Promise<Session>;
        cancel(): Promise<void>;
    };

    export const ReturnCode: {
        isSuccess(returnCode: ReturnCodeType): boolean;
        isCancel(returnCode: ReturnCodeType): boolean;
    };

    export const FFprobeKit: {
        execute(command: string): Promise<Session>;
    };
}
