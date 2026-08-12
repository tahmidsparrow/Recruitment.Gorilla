import {
  createInterviewTypeOption,
  createSkillOption,
  deleteInterviewTypeOption,
  deleteSkillOption,
  getInterviewTypeOptions,
  getSkillOptions,
  updateInterviewTypeOption,
  updateSkillOption,
} from '../services/api';
import { useAuth } from '../auth/AuthContext';
import Tabs, { TabPanel, type TabDef } from '../components/ui/Tabs';
import { useTabs } from '../components/ui/useTabs';
import JobOpeningsTab from './configuration/JobOpeningsTab';
import OptionChipsTab, { type OptionApi } from './configuration/OptionChipsTab';
import EmailSettingsTab from './configuration/EmailSettingsTab';

const skillsApi: OptionApi = {
  list: getSkillOptions,
  create: createSkillOption,
  update: updateSkillOption,
  remove: deleteSkillOption,
};

const interviewTypesApi: OptionApi = {
  list: getInterviewTypeOptions,
  create: createInterviewTypeOption,
  update: updateInterviewTypeOption,
  remove: deleteInterviewTypeOption,
};

/**
 * Configuration is four unrelated jobs, so it is four tabs rather than four
 * stacked cards on one long scroll. The active tab lives in the query string,
 * so a refresh keeps your place and a section can be linked to.
 *
 * Email is Super Admin only; the tab is absent for everyone else rather than
 * present-and-failing, matching how the sidebar handles role-gated routes.
 */
export default function ConfigurationPage() {
  const { isSuperAdmin } = useAuth();

  const tabs: TabDef[] = [
    { id: 'jobs', label: 'Job openings' },
    { id: 'skills', label: 'Skills' },
    { id: 'interview-types', label: 'Interview types' },
    ...(isSuperAdmin ? [{ id: 'email', label: 'Email' }] : []),
  ];

  const [active, setActive] = useTabs(tabs);

  return (
    <>
      <Tabs tabs={tabs} active={active} onChange={setActive} ariaLabel="Configuration sections" />

      {active === 'jobs' && (
        <TabPanel id="jobs">
          <JobOpeningsTab />
        </TabPanel>
      )}

      {active === 'skills' && (
        <TabPanel id="skills">
          <OptionChipsTab
            noun="skill"
            queryKey="skills"
            api={skillsApi}
            addPlaceholder="Add a skill…"
            description="Skills candidates can be tagged with. These appear in the candidate form's skills picker and as coloured badges on profiles."
          />
        </TabPanel>
      )}

      {active === 'interview-types' && (
        <TabPanel id="interview-types">
          <OptionChipsTab
            noun="interview type"
            queryKey="interview-types"
            api={interviewTypesApi}
            addPlaceholder="Add a type…"
            description="Interview types used as tags when scheduling — shown on the interview page and the candidate timeline."
          />
        </TabPanel>
      )}

      {active === 'email' && isSuperAdmin && (
        <TabPanel id="email">
          <EmailSettingsTab />
        </TabPanel>
      )}
    </>
  );
}
