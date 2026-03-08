import type { WSUser } from '../../hooks/useWebSocket'

interface CollaboratorsProps {
  users: WSUser[]
  currentUserId: string
}

export function Collaborators({ users, currentUserId }: CollaboratorsProps) {
  return (
    <div className="collaborators">
      {users.map((user) => (
        <div
          key={user.id}
          className="collaborator"
          title={user.id === currentUserId ? `${user.name} (你)` : user.name}
        >
          <div
            className="collaborator-avatar"
            style={{
              backgroundColor: user.color,
              border: user.id === currentUserId ? '2px solid #333' : 'none',
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          {user.id === currentUserId && <span className="collaborator-name">(你)</span>}
        </div>
      ))}
    </div>
  )
}
