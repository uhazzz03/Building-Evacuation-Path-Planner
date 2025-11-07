using System.Runtime.InteropServices;

internal static class Native
{
    [StructLayout(LayoutKind.Sequential)]
    internal struct EXPoint
    {
        public int x;
        public int y;
    }

    [DllImport("EvacuateX.Native", EntryPoint = "ex_find_path_stub", CallingConvention = CallingConvention.Cdecl)]
    internal static extern int ex_find_path_stub(
        EXPoint start,
        EXPoint goal,
        IntPtr outPath,
        int maxPathLen
    );

    [DllImport("EvacuateX.Native", CallingConvention = CallingConvention.Cdecl)]
    internal static extern int ex_find_path_grid(
        byte[] grid,
        int width,
        int height,
        EXPoint start,
        EXPoint goal,
        IntPtr outPath,
        int maxPathLen
    );
}
