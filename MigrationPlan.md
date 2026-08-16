# Native Windows Migration Plan

This document turns the rough migration notes into a concrete step-by-step
plan for moving the Network Diagnostics project from the current WSL-based
workflow to a native Windows setup.

## Goal

Move the project so it runs directly on Windows without relying on WSL for
backend networking features. The main objectives are:

- run the Flask backend directly on Windows
- use native Windows networking APIs for Wi-Fi scanning
- use Windows-native traceroute behavior
- keep the React frontend working in a normal Windows development flow
- reduce the WSL and Windows interop friction that has caused repeated
  debugging issues

## Migration strategy

The migration should be done in phases rather than all at once. This makes it
much easier to validate each subsystem and avoid breaking the whole app during
transition.

---

## DONE

~~ ### Phase 1: Prepare the Windows environment ~~

~~#### Step 1: Install a native Windows Python runtime~~

~~**What is needed:**~~

~~- Install Python from python.org, not the Microsoft Store version~~
~~- Make sure Python is added to PATH~~
~~- Verify that `python --version` and `pip --version` work from PowerShell~~

~~**Why:**~~

~~- The current project has already hit issues with the Microsoft Store Python~~
~~  runtime, especially around Windows networking and COM-based access.~~
~~- A standard python.org installation is more predictable and better suited to~~
~~  this project’s low-level networking dependencies.~~
~~- This avoids the sandboxed runtime behavior that has already caused friction~~
~~  with Wi-Fi scanning.~~

~~#### Step 2: Install Windows networking prerequisites~~

~~**What is needed:**~~

~~- Install Npcap or other WinPcap-compatible networking capture support~~
~~- Ensure the installation is configured in a way compatible with Windows~~
~~  network tools~~
~~- Optionally install Visual C++ build tools if any dependency requires~~
~~  compilation~~

~~**Why:**~~

~~- Some network features may require lower-level packet access or Windows~~
~~  driver-level integration.~~
~~- Npcap is the most practical Windows equivalent to the packet-capture~~
~~  tooling that the project has depended on indirectly.~~
~~- This is especially relevant if Wi-Fi scanning, ARP work, or packet~~
~~  inspection needs deeper access later.~~
~~
~~#### Step 3: Install Node.js, Git, and VS Code for Windows~~

~~**What is needed:**~~

~~- Install Node.js LTS~~
~~- Install Git for Windows~~
~~- Install Visual Studio Code and confirm that the Python extension is~~
  ~~available~~

~~**Why:**~~

~~- The frontend is a Vite and React app and should work normally on Windows~~
  with standard Node tooling.~~
~~- A native Git installation prevents path and line-ending issues that can~~
  arise when working across WSL and Windows filesystems.~~
~~- VS Code will be the main development environment for both frontend and~~
 ~~ backend work.~~

---

~~### Phase 2: Move the repository to a native Windows filesystem~~

~~#### Step 4: Clone or copy the repo onto the Windows filesystem~~

~~**What is needed:**~~

~~- Clone the repository into a Windows-native path such as~~
  ~~`C:\dev\network-diagnostics`~~
~~- Avoid working from a WSL-mounted path or a UNC path if possible~~

~~**Why:**~~

~~- Native Windows tools behave more reliably when the project lives on a~~
~~  normal Windows drive.~~
~~- This avoids path translation issues that can appear when Python, Node, and~~
~~  VS Code interact with WSL-mounted files.~~
~~- It also makes future debugging and packaging easier.~~ 

~~#### Step 5: Create a Windows virtual environment~~

~~**What is needed:**~~

~~- Create a virtual environment inside the backend folder, for example~~
~~  `backend\venv`~~
~~- Activate it in PowerShell~~
~~- Install the backend requirements with `pip install -r requirements.txt`~~

~~**Why:**~~

~~- The backend should have an isolated environment that matches the native~~
~~  Windows setup.~~
~~- This ensures that dependency resolution is not affected by the WSL~~
~~  environment.~~
~~- It also makes it easier to reproduce later issues if the environment~~
~~  changes.~~

~~ --- ~~

~~ ### Phase 3: Rework the backend for Windows-native execution ~~

#### Step 6: Remove the WSL-to-Windows bridge from the backend

**What is needed:**

~~ - Refactor the backend Wi-Fi workflow so it no longer depends on launching a ~~
~~  separate Windows Python process from WSL ~~
~~ - Replace the current bridge logic with a direct Windows-native ~~
~~  implementation~~

**Why:**

~~ - The current bridge approach has been a major source of issues, including ~~
~~  path mismatches, bad interpreter selection, and dependency resolution ~~
~~  failures.~~
~~ - A direct implementation is simpler and easier to debug. ~~
~~ - It removes the dependency on WSL interop for the most fragile feature in the ~~
~~  project. ~~

#### Step 7: Replace the current Wi-Fi scanning approach with a native Windows implementation

**What is needed:**

~~ - Implement Wi-Fi scanning directly in the backend using a Windows-compatible ~~
~~  library such as `pywifi` ~~
~~ - Ensure the code runs in-process on Windows without shelling out to another ~~
~~  interpreter ~~
~~ - Validate that it can return network information such as SSID and signal ~~
~~  strength ~~

**Why:**

~~ - The project’s Wi-Fi feature is the main reason for the migration. ~~
~~ - Native Windows APIs are the correct integration point for this feature.~~
~~ - This is the highest-value change because it removes the most unstable part of ~~
~~  the current architecture.~~

#### Step 8: Rewrite the traceroute implementation for Windows

**What is needed:**

- Replace the Linux and WSL-friendly approach with a Windows-native
  traceroute path
- Use `tracert` or a Windows-compatible alternative and adapt the parser to
  its output format
- Make sure hop timing and DNS lookup handling are still surfaced in the API
  in a consistent way

**Why:**

- The project’s current traceroute design was built around behavior that
  differs significantly across environments.
- Windows uses a different traceroute toolchain and output format than Linux.
- A proper native implementation avoids brittle assumptions about packet
  behavior on WSL.

#### Step 9: Revalidate routing and subnet logic on Windows

**What is needed:**

- Review `get_local_ip()`, `get_net_mask()`, and related networking helpers
- Verify that the code works with Windows interface names and routing
  behavior
- Confirm the logic still behaves correctly when the machine is on Wi-Fi,
  Ethernet, or a VPN

**Why:**

- The current network utilities were developed under WSL assumptions and may
  behave differently on Windows.
- Routing tables and interface naming differ across platforms.
- This step ensures that scan logic and local network detection remain
  accurate after the migration.

#### Step 10: Update the backend startup and background task behavior

**What is needed:**

- Ensure the Flask app starts correctly on Windows without the old WSL-specific
  guard behavior
- Confirm the background scan starts reliably on startup
- Verify that database initialization and periodic scans are not blocked by
  platform assumptions

**Why:**

- One of the biggest issues seen earlier was the startup guard logic
  preventing background scanning from running at all.
- The migration is a good opportunity to simplify startup behavior and make it
  explicit.
- A reliable startup path is critical for the app’s scan and device-tracking
  features.

---

### Phase 4: Update the development and debugging workflow

#### Step 11: Replace the Linux-specific launch configuration with a Windows-friendly one

**What is needed:**

- Update VS Code debug configuration to point to the Windows Python
  interpreter inside the new virtual environment
- Remove any WSL-specific assumptions from the launch settings
- Update the prelaunch or startup steps so they work in PowerShell rather
  than shell scripts designed for Linux

**Why:**

- The existing debug setup is tightly coupled to the WSL environment and
  should not be carried forward unchanged.
- A Windows-native debug flow will make development far less error-prone.
- This is the easiest place to eliminate hidden assumptions about the current
  platform.

#### Step 12: Replace the Linux environment helper with a Windows version

**What is needed:**

- Create a Windows-compatible setup script, such as `ensure_venv.ps1`
- Remove the Linux-specific `setcap` step from the workflow
- Replace it with a Windows-friendly setup process that checks for Python,
  creates the venv, installs dependencies, and prints clear guidance for any
  missing prerequisites

**Why:**

- The current Linux helper is not appropriate for a Windows-native
  environment.
- The migration should not simply copy Linux setup behavior into Windows and
  hope it works.
- A Windows-specific setup script makes onboarding much more reliable.

---

### Phase 5: Update the frontend and local development workflow

#### Step 13: Verify the frontend works natively on Windows

**What is needed:**

- Run the frontend with the standard Vite workflow from Windows
- Confirm the app starts correctly and can reach the backend
- Ensure any environment variables or API base URLs are still correct

**Why:**

- The frontend should not need to change much, but it must be verified under
  the new environment.
- This step confirms that the move to Windows did not introduce new frontend
  issues.
- It also helps identify any path or host-binding assumptions that were
  previously hidden by WSL.

#### Step 14: Review Docker usage and decide whether it remains part of the workflow

**What is needed:**

- Decide whether Docker will still be used for local development
- If Docker remains in the plan, verify that the compose setup is still
  appropriate for Windows
- If Docker is no longer needed, remove or simplify the Docker-specific
  workflow for local development

**Why:**

- Docker Desktop on Windows still relies on a virtualization layer and may not
  remove the platform complexity the project has been fighting.
- The migration should make this decision explicit rather than assuming Docker
  will just work the same way as before.
- This helps avoid using Docker as a workaround for issues that are really
  caused by platform assumptions.

---

### Phase 6: Test and cut over

#### Step 15: Validate the full app end to end

**What is needed:**

- Start the backend and frontend on Windows
- Verify device scanning, traceroute, Wi-Fi scanning, and label management end
  to end
- Compare results with the previous WSL workflow where relevant

**Why:**

- The migration should not be considered complete until the core product
  behaviors are verified directly.
- This step ensures that the most important features still work after the
  environment change.
- It also helps surface any remaining system-specific assumptions.

#### Step 16: Clean up deprecated WSL-specific code and documentation

**What is needed:**

- Remove or archive any code, comments, or scripts that are specific to WSL
  interop
- Update README and project documentation to describe the Windows-native
  workflow
- Note any remaining limitations or manual steps required for Windows users

**Why:**

- Leaving old WSL-specific guidance behind will cause confusion later.
- The project should clearly document the new setup path for future
  contributors.
- This also reduces the chance of future regressions caused by old
  assumptions.

---

### Recommended order of execution

1. Prepare the Windows toolchain
2. Move the repo to a native Windows path
3. Create a native Windows Python environment
4. Replace the WSL Wi-Fi bridge with a native implementation
5. Rewrite traceroute for Windows
6. Update startup and routing logic
7. Update VS Code and helper scripts
8. Verify the frontend and backend end to end
9. Remove WSL-specific leftovers and document the final workflow

---

### Risk notes

The biggest risk is trying to preserve the old WSL-based architecture too
literally. The migration will be most successful if the project is updated to
think in terms of native Windows behavior rather than adapting Linux
assumptions.

The second biggest risk is underestimating the Wi-Fi and network dependencies.
Those features are the most platform-sensitive parts of the app and should be
handled early, not left until the end.

---

### Exit criteria

The migration can be considered complete when:

- the backend runs directly on Windows without WSL
- Wi-Fi scanning works through a native Windows implementation
- traceroute works through a Windows-native path
- the frontend runs normally in a Windows development environment
- the project docs and tooling reflect the Windows workflow
