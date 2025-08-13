import Hide from "@/components/Hide";
import Spinner from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import createGoogleBackup from "@/lib/googlebackup";
import { store } from "@/state";
import { logger } from "@/state/utils";
import { LogOut } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

function GoogleBackup() {
  const { status, data: session } = useSession();
  const [loading, setLoading] = useState(false);

  async function handleCreateBackup() {
    if (status === "unauthenticated") {
      return signIn();
    }

    // if (!(session as any).accessToken) {
    //   return;
    // }

    setLoading(true);
    logger.info("Creating Google Drive Backup");

    const state = store.getSnapshot();

    // await createGoogleBackup(state.context.explorer, (session as any).accessToken, state.context.files).finally(() => {
    //   setLoading(false);
    // });

    logger.info("Google Drive Backup Complete");
  }

  return (
    <div className="">
      <h3 className="text-base text-primary flex justify-between items-center">
        <span>Google Backup</span>
        <Hide open={status === "authenticated"}>
          <button onClick={signOut as any} className="active:opacity-50">
            <LogOut size={20} />
          </button>
        </Hide>
      </h3>
      <div className="mt-3">
        <Button disabled={loading} className="w-full" size="sm" onClick={handleCreateBackup}>
          <Hide open={loading}>
            <Spinner className="w-4" />
          </Hide>
          {status === "authenticated" ? "Create Backup" : "Sign In with Google"}
        </Button>
      </div>
    </div>
  );
}

export default GoogleBackup;
